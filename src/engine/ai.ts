import type { AIDifficulty, AIAction } from './aiCore';
import type { TetrisEngine } from './TetrisEngine';
import type { PieceType } from './types';

export type { AIDifficulty };

interface PendingAction {
  kind: 'rotate' | 'move' | 'hold' | 'harddrop' | 'softdrop';
  dir?: number;
}

interface WorkerResult {
  requestId: number;
  result: { useHold: boolean; path: AIAction[] } | null;
}

const THINK_DELAY: Record<AIDifficulty, [number, number]> = {
  easy: [250, 400],
  medium: [180, 300],
  hard: [80, 150],
  hell: [15, 30],
};

const STEP_DELAY: Record<AIDifficulty, number> = {
  easy: 50,
  medium: 30,
  hard: 15,
  hell: 8,
};

export class AIController {
  engine: TetrisEngine;
  difficulty: AIDifficulty;

  private worker: Worker | null = null;
  private phase: 'idle' | 'thinking' | 'executing' = 'idle';
  private thinkTimer = 0;
  private thinkTarget = 0;
  private stepTimer = 0;
  private actions: PendingAction[] = [];
  private lastPieceType: PieceType | null = null;
  private lastPiecesPlaced = -1;
  private isCalculating = false;
  private requestCounter = 0;
  private currentRequestId = 0;

  constructor(engine: TetrisEngine, difficulty: AIDifficulty) {
    this.engine = engine;
    this.difficulty = difficulty;

    try {
      this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage;
      this.worker.onerror = (e) => console.error('AI Worker error:', e);
    } catch (err) {
      console.error('無法建立 AI Worker:', err);
      this.worker = null;
    }
  }

  setDifficulty(d: AIDifficulty) {
    this.difficulty = d;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private handleWorkerMessage = (e: MessageEvent<WorkerResult>) => {
    const { requestId, result } = e.data;
    if (requestId !== this.currentRequestId) return;
    this.isCalculating = false;

    if (result) {
      this.buildActions(result);
      this.phase = 'executing';
      this.stepTimer = 0;
    } else {
      this.phase = 'idle';
    }
  };

  private detectNewPiece(): boolean {
    const e = this.engine;
    if (!e.current) return false;
    if (e.piecesPlaced !== this.lastPiecesPlaced) {
      this.lastPiecesPlaced = e.piecesPlaced;
      return true;
    }
    return false;
  }

  private requestCalculation() {
    const e = this.engine;
    if (!e.current || !this.worker) return;

    this.currentRequestId = ++this.requestCounter;
    this.isCalculating = true;

    this.worker.postMessage({
      requestId: this.currentRequestId,
      board: e.board,
      currentType: e.current.type,
      holdType: e.holdType,
      queue: e.queue.slice(0, 5),
      canHold: e.canHold,
      difficulty: this.difficulty,
      characterId: e.characterId,
    });
  }

  private buildActions(target: { useHold: boolean; path: AIAction[] }) {
    const actions: PendingAction[] = [];
    if (target.useHold) actions.push({ kind: 'hold' });
    for (const a of target.path) {
      if (a === 'left') actions.push({ kind: 'move', dir: -1 });
      else if (a === 'right') actions.push({ kind: 'move', dir: 1 });
      else if (a === 'rotateCW') actions.push({ kind: 'rotate', dir: 1 });
      else if (a === 'rotateCCW') actions.push({ kind: 'rotate', dir: -1 });
      else if (a === 'down') actions.push({ kind: 'softdrop' });
    }
    actions.push({ kind: 'harddrop' });
    this.actions = actions;
  }

  update(dtMs: number) {
    const e = this.engine;
    if (e.gameOver || !e.current) return;

    if (this.phase === 'idle') {
      if (this.detectNewPiece() || this.lastPieceType === null) {
        this.lastPieceType = e.current.type;
        this.phase = 'thinking';
        this.thinkTimer = 0;
        const [lo, hi] = THINK_DELAY[this.difficulty];
        this.thinkTarget = lo + Math.random() * (hi - lo);
      }
      return;
    }

    if (this.phase === 'thinking') {
      this.thinkTimer += dtMs;
      if (this.thinkTimer >= this.thinkTarget && !this.isCalculating) {
        this.requestCalculation();
      }
      return;
    }

    if (this.phase === 'executing') {
      const stepDelay = STEP_DELAY[this.difficulty];
      this.stepTimer += dtMs;

      let actionsThisFrame = 0;
      const MAX_ACTIONS_PER_FRAME = 6;

      while (this.stepTimer >= stepDelay && this.actions.length > 0 && actionsThisFrame < MAX_ACTIONS_PER_FRAME) {
        this.stepTimer -= stepDelay;
        this.runNextAction();
        actionsThisFrame++;
        if (!e.current) break;
      }
      if (this.actions.length === 0) {
        this.phase = 'idle';
      }
    }
  }

  private runNextAction() {
    const e = this.engine;
    const action = this.actions[0];
    if (!action) return;
    if (!e.current) {
      this.actions = [];
      return;
    }
    if (action.kind === 'hold') {
      e.hold();
      this.actions.shift();
    } else if (action.kind === 'rotate') {
      e.rotate(action.dir === -1 ? -1 : 1);
      this.actions.shift();
    } else if (action.kind === 'move') {
      e.move(action.dir === -1 ? -1 : 1);
      this.actions.shift();
    } else if (action.kind === 'softdrop') {
      e.softDropStep();
      this.actions.shift();
    } else if (action.kind === 'harddrop') {
      e.hardDrop();
      this.actions.shift();
    }
  }
}