export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type CellValue = 0 | PieceType | 'G'; // G = garbage

export type Board = CellValue[][]; // [row][col], row 0 = top

export interface PiecePos {
  type: PieceType;
  rot: number; // 0,1,2,3
  x: number; // col of bounding box origin
  y: number; // row of bounding box origin
}

export type CharacterId = 'godjj' | 'daikai4104' | 'cg1' | 'dingyi' | 'abao';

export interface ActionCounters {
  single: number;
  double: number;
  triple: number;
  tetris: number;
  tspin: number;
  tspinSingle: number;
  tspinDouble: number;
  tspinTriple: number;
  tspinMini: number;
  b2b: number;
  maxCombo: number;
  perfectClear: number;
  piecesPlaced: number;
}

export interface AttackBreakdownEntry {
  label: string;
  points: number;
  garbage: number;
}

export interface EngineStats {
  counters: ActionCounters;
  score: number;
  linesCleared: number;
  garbageSent: number;
  garbageReceived: number;
  breakdown: AttackBreakdownEntry[];
}

export interface LineClearResult {
  linesCleared: number;
  isTspin: boolean;
  isTspinMini: boolean;
  clearType: 'single' | 'double' | 'triple' | 'tetris' | null;
  b2b: boolean;
  combo: number;
  perfectClear: boolean;
  garbageSent: number;
  scoreGained: number;
  label: string;
}

export interface EngineEvents {
  onAttack?: (lines: number, holeColumns: number[] | null, hard?: boolean) => void;
  onGarbageReceived?: (lines: number) => void;
  onTopOut?: () => void;
  onLineClear?: (result: LineClearResult) => void;
  onHold?: () => void;
  onPieceLock?: () => void;
  onSelfRepair?: (rows: number) => void;
}
