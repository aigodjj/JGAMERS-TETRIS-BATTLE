import { computeBestPlacement, type AIDifficulty } from './aiCore';
import type { Board, PieceType } from './types';

interface WorkerRequest {
  requestId: number;
  board: Board;
  currentType: PieceType;
  holdType: PieceType | null;
  queue: PieceType[];
  canHold: boolean;
  difficulty: AIDifficulty;
  characterId: string;
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (data: any) => void;
};

ctx.onmessage = (e) => {
  const { requestId, board, currentType, holdType, queue, canHold, difficulty, characterId } = e.data;
  const result = computeBestPlacement(board, currentType, holdType, queue, canHold, difficulty, characterId);
  ctx.postMessage({ requestId, result });
};