import { getKicks, PIECE_SHAPES } from './srs';
import { COLS, TOTAL_ROWS, BUFFER_ROWS } from './TetrisEngine';
import type { Board, CellValue, PieceType } from './types';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'hell';
export type AIAction = 'left' | 'right' | 'rotateCW' | 'rotateCCW' | 'down';

interface PlacementState {
  x: number;
  y: number;
  rot: number;
}

interface SearchResult {
  grounded: Map<string, PlacementState>;
  cameFrom: Map<string, { prevKey: string; action: AIAction }>;
  startKey: string;
}

interface Weights {
  height: number;
  holes: number;
  bumpiness: number;
  wellDepth: number;
  tetrisBonus: number;
  singleClearPenalty: number;
  doubleClearPenalty: number;
  holdBonus: number;
}

const WEIGHTS: Record<AIDifficulty, Weights> = {
  easy: { height: -0.5, holes: -4.0, bumpiness: -0.3, wellDepth: 0.1, tetrisBonus: 15, singleClearPenalty: -2, doubleClearPenalty: -1, holdBonus: 2 },
  medium: { height: -0.8, holes: -8.0, bumpiness: -0.6, wellDepth: 0.5, tetrisBonus: 60, singleClearPenalty: -10, doubleClearPenalty: -3, holdBonus: 10 },
  hard: { height: -1.0, holes: -12.0, bumpiness: -0.8, wellDepth: 1.0, tetrisBonus: 150, singleClearPenalty: -25, doubleClearPenalty: -8, holdBonus: 25 },
  hell: { height: -1.3, holes: -16.0, bumpiness: -1.0, wellDepth: 1.5, tetrisBonus: 300, singleClearPenalty: -50, doubleClearPenalty: -15, holdBonus: 50 },
};

const MISTAKE_CHANCE: Record<AIDifficulty, number> = { easy: 0.018, medium: 0.001, hard: 0.0002, hell: 0 };

function getCells(type: PieceType, state: PlacementState): [number, number][] {
  return PIECE_SHAPES[type][state.rot].map(([lx, ly]) => [state.x + lx, state.y + ly] as [number, number]);
}

function collidesOn(board: Board, type: PieceType, state: PlacementState): boolean {
  for (const [bx, by] of getCells(type, state)) {
    if (bx < 0 || bx >= COLS || by >= TOTAL_ROWS) return true;
    if (by >= 0 && board[by][bx] !== 0) return true;
  }
  return false;
}

const stateKey = (s: PlacementState) => `${s.x},${s.y},${s.rot}`;

function bfsSearch(board: Board, type: PieceType): SearchResult {
  const start: PlacementState = { x: 3, y: 0, rot: 0 };
  const startKey = stateKey(start);
  const grounded: Map<string, PlacementState> = new Map();
  const cameFrom: Map<string, { prevKey: string; action: AIAction }> = new Map();
  if (collidesOn(board, type, start)) return { grounded, cameFrom, startKey };
  const visited = new Set<string>([startKey]);
  const queue: PlacementState[] = [start];
  let iterations = 0;

  while (queue.length > 0 && iterations < 5000) {
    iterations++;
    const s = queue.shift()!;
    const sKey = stateKey(s);
    const down = { ...s, y: s.y + 1 };
    if (collidesOn(board, type, down)) {
      grounded.set(sKey, s);
    } else {
      const k = stateKey(down);
      if (!visited.has(k)) {
        visited.add(k);
        cameFrom.set(k, { prevKey: sKey, action: 'down' });
        queue.push(down);
      }
    }
    const left = { ...s, x: s.x - 1 };
    if (!collidesOn(board, type, left)) {
      const k = stateKey(left);
      if (!visited.has(k)) {
        visited.add(k);
        cameFrom.set(k, { prevKey: sKey, action: 'left' });
        queue.push(left);
      }
    }
    const right = { ...s, x: s.x + 1 };
    if (!collidesOn(board, type, right)) {
      const k = stateKey(right);
      if (!visited.has(k)) {
        visited.add(k);
        cameFrom.set(k, { prevKey: sKey, action: 'right' });
        queue.push(right);
      }
    }
    for (const dir of [1, -1] as const) {
      const to = (s.rot + dir + 4) % 4;
      const kicks = getKicks(type, s.rot, to);
      for (const [ox, oy] of kicks) {
        const candidate: PlacementState = { x: s.x + ox, y: s.y - oy, rot: to };
        if (!collidesOn(board, type, candidate)) {
          const k = stateKey(candidate);
          if (!visited.has(k)) {
            visited.add(k);
            cameFrom.set(k, { prevKey: sKey, action: dir === 1 ? 'rotateCW' : 'rotateCCW' });
            queue.push(candidate);
          }
          break;
        }
      }
    }
  }
  return { grounded, cameFrom, startKey };
}

function bfsGroundedPlacements(board: Board, type: PieceType): PlacementState[] {
  return Array.from(bfsSearch(board, type).grounded.values());
}

function reconstructPath(result: SearchResult, targetKey: string): AIAction[] {
  const path: AIAction[] = [];
  let cur = targetKey;
  let guard = 0;
  while (cur !== result.startKey && guard < 1000) {
    guard++;
    const step = result.cameFrom.get(cur);
    if (!step) break;
    path.push(step.action);
    cur = step.prevKey;
  }
  path.reverse();
  return path;
}

function dropToGround(board: Board, type: PieceType, state: PlacementState): PlacementState {
  let y = state.y;
  while (!collidesOn(board, type, { ...state, y: y + 1 })) y++;
  return { ...state, y };
}

function simulatePlacement(board: Board, type: PieceType, state: PlacementState): { board: Board; lines: number } {
  const final = dropToGround(board, type, state);
  const newBoard = board.map((row) => [...row]);
  for (const [bx, by] of getCells(type, final)) {
    if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < COLS) newBoard[by][bx] = type;
  }

  let lines = 0;
  for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
    if (newBoard[r].every((c) => c !== 0)) {
      newBoard.splice(r, 1);
      newBoard.unshift(Array<CellValue>(COLS).fill(0));
      lines++;
      r++;
    }
  }
  return { board: newBoard, lines };
}

function evaluateBoard(board: Board, lines: number, w: Weights, characterId: string): number {
  const heights = new Array(COLS).fill(0);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (board[r][c] !== 0) {
        heights[c] = TOTAL_ROWS - r;
        break;
      }
    }
  }

  let holes = 0;
  let blocksAboveHoles = 0;
  for (let c = 0; c < COLS; c++) {
    let blockFound = false;
    let currentBlocks = 0;
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (board[r][c] !== 0) {
        blockFound = true;
        currentBlocks++;
      } else if (blockFound) {
        holes++;
        blocksAboveHoles += currentBlocks;
      }
    }
  }

  let bumpiness = 0;
  for (let c = 0; c < COLS - 1; c++) bumpiness += Math.abs(heights[c] - heights[c + 1]);
  const aggregateHeight = heights.reduce((a, b) => a + b, 0);
  const maxHeight = Math.max(...heights) - BUFFER_ROWS;

  const wellCol = COLS - 1;
  let otherMaxHeight = 0;
  let otherTotalHeight = 0;
  for (let c = 0; c < wellCol; c++) {
    if (heights[c] > otherMaxHeight) otherMaxHeight = heights[c];
    otherTotalHeight += heights[c];
  }

  let heightPenalty = w.height * aggregateHeight;

  let stackPenalty = 0;
  if (otherMaxHeight > 4) {
    stackPenalty -= Math.pow(otherMaxHeight - 4, 2) * 15.0;
  }
  if (otherMaxHeight > 8) {
    stackPenalty -= Math.pow(otherMaxHeight - 8, 3) * 30.0;
  }

  let holePenalty = w.holes * holes * (1 + holes * 0.15) + blocksAboveHoles * -3.0;

  let wellBonus = 0;
  let wellDepth = 0;
  for (let c = 0; c < wellCol; c++) {
    wellDepth = Math.max(wellDepth, heights[c] - heights[wellCol]);
  }
  if (heights[wellCol] < Math.min(...heights.slice(0, wellCol))) {
    wellBonus = w.wellDepth * Math.min(wellDepth, 4);
  }

  let bumpinessPenalty = w.bumpiness * bumpiness * 2.0;

  let linesScore = 0;

  if (otherMaxHeight > 8) {
    linesScore = lines * 100.0;
  } else {
    if (lines === 1) linesScore = w.singleClearPenalty;
    else if (lines === 2) linesScore = w.doubleClearPenalty;
    else if (lines === 3) linesScore = 0;
    else if (lines === 4) linesScore = w.tetrisBonus;
  }

  let charBonus = 0;
  if (characterId === 'cg1') {
    charBonus = lines === 4 ? w.tetrisBonus * 0.2 : 0;
  }

  return heightPenalty + holePenalty + bumpinessPenalty + linesScore + wellBonus + charBonus + stackPenalty;
}

export interface BestPlacement {
  useHold: boolean;
  path: AIAction[];
}

export function computeBestPlacement(
  board: Board,
  currentType: PieceType,
  holdType: PieceType | null,
  queue: PieceType[],
  canHold: boolean,
  difficulty: AIDifficulty,
  characterId: string
): BestPlacement | null {
  const w = WEIGHTS[difficulty];

  const options: { type: PieceType; useHold: boolean }[] = [{ type: currentType, useHold: false }];
  const holdCandidateType = holdType ?? queue[0];
  if (holdCandidateType && canHold) {
    options.push({ type: holdCandidateType, useHold: true });
  }

  let best: { useHold: boolean; path: AIAction[]; score: number } | null = null;
  let allCandidates: { useHold: boolean; path: AIAction[]; score: number }[] = [];

  const lookahead = difficulty === 'hard' || difficulty === 'hell';
  const nextType = queue[0];

  for (const opt of options) {
    const search = bfsSearch(board, opt.type);
    for (const [sKey, p] of search.grounded) {
      const final = dropToGround(board, opt.type, p);
      const sim = simulatePlacement(board, opt.type, final);
      let score = evaluateBoard(sim.board, sim.lines, w, characterId);

      if (opt.useHold) {
        score += w.holdBonus;
        if (opt.type === 'I') {
          let currentWellDepth = 0;
          for (let c = 0; c < COLS - 1; c++) {
            const h = Math.max(0, TOTAL_ROWS - board.findIndex((row) => row[c] !== 0));
            currentWellDepth = Math.max(currentWellDepth, h);
          }
          if (currentWellDepth < 3) score += w.holdBonus * 2;
        }
      }

      if (lookahead && nextType) {
        const nextPlacements = bfsGroundedPlacements(sim.board, nextType);
        let bestNext = -Infinity;
        for (const np of nextPlacements.slice(0, 25)) {
          const nf = dropToGround(sim.board, nextType, np);
          const nsim = simulatePlacement(sim.board, nextType, nf);
          const ns = evaluateBoard(nsim.board, nsim.lines, w, characterId);
          if (ns > bestNext) bestNext = ns;
        }
        if (bestNext > -Infinity) score = score * 0.65 + bestNext * 0.35;
      }

      const path = reconstructPath(search, sKey);
      const candidate = { useHold: opt.useHold, path, score };
      allCandidates.push(candidate);
      if (!best || score > best.score) best = candidate;
    }
  }

  if (best && Math.random() < MISTAKE_CHANCE[difficulty]) {
    allCandidates.sort((a, b) => b.score - a.score);
    const mistakeRange = allCandidates.slice(1, Math.min(6, allCandidates.length));
    if (mistakeRange.length > 0) {
      const choice = mistakeRange[Math.floor(Math.random() * mistakeRange.length)];
      return { useHold: choice.useHold, path: choice.path };
    }
  }

  if (!best) return null;
  return { useHold: best.useHold, path: best.path };
}