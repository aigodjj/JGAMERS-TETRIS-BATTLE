import { PIECE_SHAPES, getKicks, makeBag } from './srs';
import type {
  Board,
  CellValue,
  CharacterId,
  EngineEvents,
  PieceType,
  PiecePos,
  ActionCounters,
  AttackBreakdownEntry,
} from './types';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const BUFFER_ROWS = 4;
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;

const DAS_MS = 133;
const ARR_MS = 15;
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
const SOFT_DROP_MS = 60;
const NORMAL_DROP_BASE_MS = 900;

const COMBO_TABLE = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5];

// 單次攻擊上限，避免一發秒殺
const MAX_GARBAGE_PER_ATTACK = 8;

interface GarbageEntry {
  lines: number;
  holeCols: number[];
  hard: boolean;
}

interface AttackResult {
  toOpponent: number;
  holeCols: number[];
  hard: boolean;
}

function emptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array<CellValue>(COLS).fill(0));
}

function cloneShapeCells(type: PieceType, rot: number): number[][] {
  return PIECE_SHAPES[type][rot];
}

export class TetrisEngine {
  board: Board = emptyBoard();
  garbageRowFlags: boolean[] = Array(TOTAL_ROWS).fill(false);
  queue: PieceType[] = [];
  current: PiecePos | null = null;
  holdType: PieceType | null = null;
  canHold = true;
  lockTimer = 0;
  lockResets = 0;
  isGrounded = false;
  lastMoveWasRotation = false;
  lastKickIndex = 0;
  combo = -1;
  b2b = 0;
  gameOver = false;
  characterId: CharacterId;
  events: EngineEvents;

  pendingIncoming: GarbageEntry[] = [];
  pendingHardIncoming: GarbageEntry[] = [];

  holdGarbageCooldown = 0;

  private leftDown = false;
  private rightDown = false;
  private softDropDown = false;
  private dasTimer = 0;
  private arrTimer = 0;
  private dasDirection: -1 | 0 | 1 = 0;
  private gravityTimer = 0;

  stats: {
    counters: ActionCounters;
    score: number;
    linesCleared: number;
    garbageSent: number;
    garbageReceived: number;
    breakdown: AttackBreakdownEntry[];
  };

  piecesPlaced = 0;

  constructor(characterId: CharacterId, events: EngineEvents = {}) {
    this.characterId = characterId;
    this.events = events;
    this.stats = {
      counters: {
        single: 0,
        double: 0,
        triple: 0,
        tetris: 0,
        tspin: 0,
        tspinSingle: 0,
        tspinDouble: 0,
        tspinTriple: 0,
        tspinMini: 0,
        b2b: 0,
        maxCombo: 0,
        perfectClear: 0,
        piecesPlaced: 0,
      },
      score: 0,
      linesCleared: 0,
      garbageSent: 0,
      garbageReceived: 0,
      breakdown: [],
    };
    this.refillQueue();
    this.spawnNext();
  }

  private refillQueue() {
    while (this.queue.length < 7) {
      this.queue.push(...makeBag());
    }
  }

  getNextPreview(count = 5): PieceType[] {
    return this.queue.slice(0, count);
  }

  private spawnPositionFor(type: PieceType): PiecePos {
    const x = type === 'O' ? 3 : 3;
    return { type, rot: 0, x, y: 0 };
  }

  private spawnNext() {
    this.refillQueue();
    const type = this.queue.shift()!;
    this.refillQueue();
    const piece = this.spawnPositionFor(type);
    this.current = piece;
    this.canHold = true;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastMoveWasRotation = false;
    this.gravityTimer = 0;
    if (this.collides(piece)) {
      this.gameOver = true;
      this.events.onTopOut?.();
    }
  }

  private getCells(piece: PiecePos): [number, number][] {
    return cloneShapeCells(piece.type, piece.rot).map(
      ([lx, ly]) => [piece.x + lx, piece.y + ly] as [number, number]
    );
  }

  collides(piece: PiecePos): boolean {
    for (const [bx, by] of this.getCells(piece)) {
      if (bx < 0 || bx >= COLS || by >= TOTAL_ROWS) return true;
      if (by >= 0 && this.board[by][bx] !== 0) return true;
    }
    return false;
  }

  private isTouchingGround(piece: PiecePos): boolean {
    const test = { ...piece, y: piece.y + 1 };
    return this.collides(test);
  }

  setInput(action: 'left' | 'right' | 'softDrop', down: boolean) {
    if (action === 'left') {
      this.leftDown = down;
      if (down) {
        this.dasDirection = -1;
        this.dasTimer = 0;
        this.arrTimer = ARR_MS;
        this.move(-1);
      } else if (this.dasDirection === -1) {
        this.dasDirection = this.rightDown ? 1 : 0;
        this.dasTimer = 0;
      }
    } else if (action === 'right') {
      this.rightDown = down;
      if (down) {
        this.dasDirection = 1;
        this.dasTimer = 0;
        this.arrTimer = ARR_MS;
        this.move(1);
      } else if (this.dasDirection === 1) {
        this.dasDirection = this.leftDown ? -1 : 0;
        this.dasTimer = 0;
      }
    } else if (action === 'softDrop') {
      this.softDropDown = down;
    }
  }

  move(dx: number): boolean {
    if (!this.current || this.gameOver) return false;
    const candidate = { ...this.current, x: this.current.x + dx };
    if (this.collides(candidate)) return false;
    this.current = candidate;
    this.lastMoveWasRotation = false;
    this.onSuccessfulMove();
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    if (!this.current || this.gameOver) return false;
    const from = this.current.rot;
    const to = (from + dir + 4) % 4;
    const kicks = getKicks(this.current.type, from, to);
    for (let i = 0; i < kicks.length; i++) {
      const [ox, oy] = kicks[i];
      const candidate: PiecePos = { ...this.current, rot: to, x: this.current.x + ox, y: this.current.y - oy };
      if (!this.collides(candidate)) {
        this.current = candidate;
        this.lastMoveWasRotation = true;
        this.lastKickIndex = i;
        this.onSuccessfulMove();
        return true;
      }
    }
    return false;
  }

  private onSuccessfulMove() {
    if (!this.current) return;
    if (this.isTouchingGround(this.current)) {
      if (this.lockResets < MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    } else {
      this.lockTimer = 0;
    }
  }

  softDropStep() {
    if (!this.current || this.gameOver) return;
    const candidate = { ...this.current, y: this.current.y + 1 };
    if (!this.collides(candidate)) {
      this.current = candidate;
      this.lastMoveWasRotation = false;
      this.stats.score += 1;
    }
  }

  hardDrop() {
    if (!this.current || this.gameOver) return;
    let dropDistance = 0;
    while (!this.collides({ ...this.current, y: this.current.y + 1 })) {
      this.current = { ...this.current, y: this.current.y + 1 };
      dropDistance++;
    }
    this.lastMoveWasRotation = false;
    this.stats.score += dropDistance * 2;
    this.lockPiece();
  }

  hold() {
    if (!this.current || !this.canHold || this.gameOver) return;
    this.canHold = false;
    const curType = this.current.type;
    if (this.holdType === null) {
      this.holdType = curType;
      this.spawnNext();
    } else {
      const swapped = this.holdType;
      this.holdType = curType;
      this.current = this.spawnPositionFor(swapped);
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lastMoveWasRotation = false;
      if (this.collides(this.current)) {
        this.gameOver = true;
        this.events.onTopOut?.();
      }
    }
    this.events.onHold?.();

    // dingyi：Hold 清除垃圾（削弱版：CD 8 秒，清 1 行）
    if (this.characterId === 'dingyi' && this.holdGarbageCooldown <= 0) {
      const removed = this.removeBottomGarbageRows(1);
      if (removed > 0) {
        this.holdGarbageCooldown = 8000;
        this.events.onSelfRepair?.(removed);
      }
    }
  }

  private removeBottomGarbageRows(maxRows: number): number {
    let removed = 0;
    for (let r = TOTAL_ROWS - 1; r >= 0 && removed < maxRows; r--) {
      if (this.garbageRowFlags[r]) {
        this.board.splice(r, 1);
        this.garbageRowFlags.splice(r, 1);
        this.board.unshift(Array<CellValue>(COLS).fill(0));
        this.garbageRowFlags.unshift(false);
        removed++;
      }
    }
    return removed;
  }

  getGhostY(): number {
    if (!this.current) return 0;
    let y = this.current.y;
    while (!this.collides({ ...this.current, y: y + 1 })) y++;
    return y;
  }

  private cornerFilled(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y < 0) return false;
    return this.board[y][x] !== 0;
  }

  private checkTSpin(piece: PiecePos): { isTspin: boolean; isMini: boolean } {
    if (piece.type !== 'T' || !this.lastMoveWasRotation) return { isTspin: false, isMini: false };
    const { x, y, rot } = piece;
    const corners = {
      tl: this.cornerFilled(x, y),
      tr: this.cornerFilled(x + 2, y),
      bl: this.cornerFilled(x, y + 2),
      br: this.cornerFilled(x + 2, y + 2),
    };
    const total = Number(corners.tl) + Number(corners.tr) + Number(corners.bl) + Number(corners.br);
    if (total < 3) return { isTspin: false, isMini: false };
    let front: number;
    let back: number;
    switch (rot) {
      case 0:
        front = Number(corners.tl) + Number(corners.tr);
        back = Number(corners.bl) + Number(corners.br);
        break;
      case 1:
        front = Number(corners.tr) + Number(corners.br);
        back = Number(corners.tl) + Number(corners.bl);
        break;
      case 2:
        front = Number(corners.bl) + Number(corners.br);
        back = Number(corners.tl) + Number(corners.tr);
        break;
      default:
        front = Number(corners.tl) + Number(corners.bl);
        back = Number(corners.tr) + Number(corners.br);
        break;
    }
    if (front === 2) return { isTspin: true, isMini: false };
    if (front === 1 && back === 2) {
      if (this.lastKickIndex === 4) return { isTspin: true, isMini: false };
      return { isTspin: true, isMini: true };
    }
    return { isTspin: false, isMini: false };
  }

  private randomHoleCol(): number {
    return Math.floor(Math.random() * COLS);
  }

  // 削弱版：所有角色的垃圾洞口都固定同一列（不再是 cg1 專屬隨機）
  private computeGarbageEntry(lines: number, hard: boolean): GarbageEntry {
    const holeCols: number[] = [];
    const col = this.randomHoleCol();
    for (let i = 0; i < lines; i++) holeCols.push(col);
    return { lines, holeCols, hard };
  }

  receiveGarbage(lines: number, holeCols?: number[], hard = false) {
    if (lines <= 0) return;
    // 單次接收上限，避免對手一次送超過 8 行
    const cappedLines = Math.min(lines, MAX_GARBAGE_PER_ATTACK);
    const entry: GarbageEntry = {
      lines: cappedLines,
      holeCols: holeCols && holeCols.length === cappedLines ? holeCols : Array.from({ length: cappedLines }, () => this.randomHoleCol()),
      hard,
    };
    this.stats.garbageReceived += cappedLines;
    this.events.onGarbageReceived?.(cappedLines);
    if (hard) {
      this.materializeGarbage([entry]);
    } else {
      this.pendingIncoming.push(entry);
    }
  }

  private totalPendingNormal(): number {
    return this.pendingIncoming.reduce((s, e) => s + e.lines, 0);
  }

  private cancelPendingIncoming(amount: number) {
    let remaining = amount;
    while (remaining > 0 && this.pendingIncoming.length > 0) {
      const entry = this.pendingIncoming[0];
      if (entry.lines <= remaining) {
        remaining -= entry.lines;
        this.pendingIncoming.shift();
      } else {
        entry.lines -= remaining;
        entry.holeCols.splice(0, remaining);
        remaining = 0;
      }
    }
  }

  private materializeGarbage(entries: GarbageEntry[]) {
    const totalLines = entries.reduce((s, e) => s + e.lines, 0);
    if (totalLines <= 0) return;
    const holeCols: number[] = [];
    for (const e of entries) holeCols.push(...e.holeCols);
    this.board.splice(0, totalLines);
    this.garbageRowFlags.splice(0, totalLines);
    for (const hole of holeCols) {
      const row = Array<CellValue>(COLS).fill('G');
      row[hole] = 0;
      this.board.push(row);
      this.garbageRowFlags.push(true);
    }
    if (this.current && this.collides(this.current)) {
      this.gameOver = true;
      this.events.onTopOut?.();
    }
  }

  private selfRepair(rows: number) {
    const removed = this.removeBottomGarbageRows(rows);
    if (removed > 0) this.events.onSelfRepair?.(removed);
  }

  lockPiece(): AttackResult | null {
    if (!this.current || this.gameOver) return null;
    const piece = this.current;
    const { isTspin, isMini } = this.checkTSpin(piece);

    for (const [bx, by] of this.getCells(piece)) {
      if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < COLS) {
        this.board[by][bx] = piece.type;
        this.garbageRowFlags[by] = false;
      }
    }

    const fullRows: number[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.board[r].every((c) => c !== 0)) fullRows.push(r);
    }
    const linesCleared = fullRows.length;

    if (linesCleared > 0) {
      for (const r of fullRows) {
        this.board.splice(r, 1);
        this.garbageRowFlags.splice(r, 1);
        this.board.unshift(Array<CellValue>(COLS).fill(0));
        this.garbageRowFlags.unshift(false);
      }
    }

    let clearType: 'single' | 'double' | 'triple' | 'tetris' | null = null;
    if (linesCleared === 1) clearType = 'single';
    else if (linesCleared === 2) clearType = 'double';
    else if (linesCleared === 3) clearType = 'triple';
    else if (linesCleared === 4) clearType = 'tetris';

    const isDifficult = clearType === 'tetris' || (isTspin && linesCleared > 0);

    if (linesCleared > 0) {
      this.combo++;
    } else if (!isTspin) {
      this.combo = -1;
    }
    this.stats.counters.maxCombo = Math.max(this.stats.counters.maxCombo, this.combo);

    let b2bActiveNow = false;
    if (linesCleared > 0) {
      if (isDifficult) {
        if (this.b2b > 0) b2bActiveNow = true;
        this.b2b++;
      } else {
        this.b2b = 0;
      }
    }

    const perfectClear = linesCleared > 0 && this.board.every((row) => row.every((c) => c === 0));

    const breakdown: AttackBreakdownEntry[] = [];
    let scoreGained = 0;
    let garbageBase = 0;
    let label = '';

    const pushBreak = (l: string, pts: number, gb: number) => {
      breakdown.push({ label: l, points: pts, garbage: gb });
    };

    if (isTspin && linesCleared === 0) {
      scoreGained += isMini ? 100 : 400;
      label = isMini ? 'T-Spin Mini' : 'T-Spin';
      pushBreak(label, scoreGained, 0);
      this.stats.counters.tspin++;
    } else if (isTspin && linesCleared > 0) {
      const tspinScores: Record<number, number> = { 1: isMini ? 200 : 800, 2: 1200, 3: 1600 };
      scoreGained += tspinScores[linesCleared] || 0;
      let gb = linesCleared === 1 ? 2 : linesCleared === 2 ? 4 : 6;
      // abao：T-Spin 從 +2 削弱為 +1
      if (this.characterId === 'abao') gb += 1;
      garbageBase += gb;
      label = `T-Spin ${linesCleared === 1 ? 'Single' : linesCleared === 2 ? 'Double' : 'Triple'}`;
      pushBreak(label, scoreGained, gb);
      this.stats.counters.tspin++;
      if (linesCleared === 1) this.stats.counters.tspinSingle++;
      if (linesCleared === 2) this.stats.counters.tspinDouble++;
      if (linesCleared === 3) this.stats.counters.tspinTriple++;
    } else if (clearType) {
      const baseScores: Record<string, number> = { single: 100, double: 300, triple: 500, tetris: 800 };
      const baseGarbage: Record<string, number> = { single: 0, double: 1, triple: 2, tetris: 4 };
      scoreGained += baseScores[clearType];
      garbageBase += baseGarbage[clearType];
      // cg1：Tetris 從 +2 削弱為 +1
      if (clearType === 'tetris' && this.characterId === 'cg1') garbageBase += 1;
      label = clearType[0].toUpperCase() + clearType.slice(1);
      pushBreak(label, scoreGained, garbageBase);
      (this.stats.counters as any)[clearType]++;
    }

    if (b2bActiveNow && linesCleared > 0) {
      // B2B 統一 +1（移除 abao 的加倍）
      const b2bBonusGarbage = 1;
      const b2bBonusScore = Math.floor(scoreGained * 0.5);
      scoreGained += b2bBonusScore;
      garbageBase += b2bBonusGarbage;
      pushBreak('Back-to-Back', b2bBonusScore, b2bBonusGarbage);
      this.stats.counters.b2b++;
    }

    let comboGarbage = 0;
    if (this.combo > 0) {
      comboGarbage = COMBO_TABLE[Math.min(this.combo, COMBO_TABLE.length - 1)];
      // godjj：連擊從 ×1.5 削弱為 ×1.2
      if (this.characterId === 'godjj') comboGarbage = Math.round(comboGarbage * 1.2);
      const comboScore = 50 * this.combo;
      scoreGained += comboScore;
      garbageBase += comboGarbage;
      pushBreak(`Combo x${this.combo}`, comboScore, comboGarbage);
    }

    // 移除硬核垃圾（godjj 的 Combo Storm Burst 已刪除）
    const hardGarbage = 0;

    if (perfectClear) {
      const pcScore = 2000;
      const pcGarbage = 10;
      scoreGained += pcScore;
      garbageBase += pcGarbage;
      pushBreak('Perfect Clear', pcScore, pcGarbage);
      this.stats.counters.perfectClear++;
    }

    this.stats.score += scoreGained;
    this.stats.linesCleared += linesCleared;
    this.stats.breakdown.push(...breakdown);
    this.piecesPlaced++;
    this.stats.counters.piecesPlaced++;

    // daikai4104：從清 2 行削弱為清 1 行
    if (this.characterId === 'daikai4104' && (clearType === 'tetris' || isTspin)) {
      this.selfRepair(1);
    }

    // garbage cancel / send
    let result: AttackResult | null = null;
    if (garbageBase > 0) {
      let cancelAmount = garbageBase;
      // dingyi：抵消效率從 +30% 削弱為 +15%
      if (this.characterId === 'dingyi') cancelAmount = Math.round(cancelAmount * 1.15);
      const pending = this.totalPendingNormal();
      const actuallyCanceled = Math.min(pending, cancelAmount);
      this.cancelPendingIncoming(actuallyCanceled);
      // 單次攻擊上限 8 行
      const toOpponent = Math.min(Math.max(0, garbageBase - actuallyCanceled), MAX_GARBAGE_PER_ATTACK);
      if (toOpponent > 0) {
        const entry = this.computeGarbageEntry(toOpponent, false);
        this.stats.garbageSent += toOpponent;
        result = { toOpponent, holeCols: entry.holeCols, hard: false };
        this.events.onAttack?.(toOpponent, entry.holeCols, false);
      }
    } else if (linesCleared === 0) {
      if (this.pendingHardIncoming.length > 0) {
        this.materializeGarbage(this.pendingHardIncoming);
        this.pendingHardIncoming = [];
      }
      if (this.pendingIncoming.length > 0) {
        this.materializeGarbage(this.pendingIncoming);
        this.pendingIncoming = [];
      }
    }

    this.events.onLineClear?.({
      linesCleared,
      isTspin,
      isTspinMini: isMini,
      clearType,
      b2b: b2bActiveNow,
      combo: this.combo,
      perfectClear,
      garbageSent: garbageBase + hardGarbage,
      scoreGained,
      label: label || (isTspin ? 'T-Spin' : ''),
    });

    this.events.onPieceLock?.();
    this.spawnNext();
    return result;
  }

  tick(dtMs: number) {
    if (this.gameOver || !this.current) return;

    if (this.holdGarbageCooldown > 0) this.holdGarbageCooldown = Math.max(0, this.holdGarbageCooldown - dtMs);

    if (this.dasDirection !== 0) {
      this.dasTimer += dtMs;
      if (this.dasTimer >= DAS_MS) {
        this.arrTimer += dtMs;
        while (this.arrTimer >= ARR_MS) {
          this.arrTimer -= ARR_MS;
          this.move(this.dasDirection);
          if (ARR_MS <= 0) break;
        }
      }
    }

    this.isGrounded = this.isTouchingGround(this.current);

    const level = Math.floor(this.piecesPlaced / 15) + 1;
    const dropInterval = this.softDropDown ? SOFT_DROP_MS : Math.max(80, NORMAL_DROP_BASE_MS - level * 40);
    this.gravityTimer += dtMs;
    while (this.gravityTimer >= dropInterval) {
      this.gravityTimer -= dropInterval;
      if (!this.collides({ ...this.current, y: this.current.y + 1 })) {
        this.current = { ...this.current, y: this.current.y + 1 };
        this.lastMoveWasRotation = false;
        if (this.softDropDown) this.stats.score += 1;
      } else {
        break;
      }
    }

    if (this.isGrounded) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this.lockPiece();
      }
    } else {
      this.lockTimer = 0;
    }
  }

  getVisibleBoard(): CellValue[][] {
    return this.board.slice(BUFFER_ROWS);
  }

  getRenderInfo(): {
    board: CellValue[][];
    pieceCells: [number, number][];
    ghostCells: [number, number][];
    pieceType: PieceType | null;
    pendingGarbageCount: number;
  } {
    const board = this.getVisibleBoard().map((row) => [...row]);
    const pieceCells: [number, number][] = [];
    const ghostCells: [number, number][] = [];
    if (this.current && !this.gameOver) {
      const ghostY = this.getGhostY();
      const ghostPiece = { ...this.current, y: ghostY };
      for (const [bx, by] of this.getCells(ghostPiece)) {
        const vr = by - BUFFER_ROWS;
        if (vr >= 0 && vr < VISIBLE_ROWS) ghostCells.push([vr, bx]);
      }
      for (const [bx, by] of this.getCells(this.current)) {
        const vr = by - BUFFER_ROWS;
        if (vr >= 0 && vr < VISIBLE_ROWS) pieceCells.push([vr, bx]);
      }
    }
    const pendingGarbageCount =
      this.pendingIncoming.reduce((s, e) => s + e.lines, 0) +
      this.pendingHardIncoming.reduce((s, e) => s + e.lines, 0);
    return { board, pieceCells, ghostCells, pieceType: this.current?.type ?? null, pendingGarbageCount };
  }

  getVisibleGarbageFlags(): boolean[] {
    return this.garbageRowFlags.slice(BUFFER_ROWS);
  }

  getHeight(): number {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.board[r].some((c) => c !== 0)) return TOTAL_ROWS - r - BUFFER_ROWS;
    }
    return 0;
  }
}
