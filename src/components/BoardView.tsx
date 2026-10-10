import { PIECE_COLORS } from '../engine/srs';
import type { CellValue, PieceType } from '../engine/types';

interface Props {
  board: CellValue[][];
  pieceCells: [number, number][];
  ghostCells: [number, number][];
  pieceType: PieceType | null;
  frameColor: string;
  small?: boolean;
  label?: string;
  dimmed?: boolean;
}

function cellColor(v: CellValue): string {
  if (v === 0) return 'transparent';
  if (v === 'G') return '#6b7280';
  return PIECE_COLORS[v as PieceType] || '#999';
}

export default function BoardView({ board, pieceCells, ghostCells, pieceType, frameColor, small, label, dimmed }: Props) {
  const ghostSet = new Set(ghostCells.map(([r, c]) => `${r},${c}`));
  const cellPx = small ? 14 : 28;
  const pieceColor = pieceType ? PIECE_COLORS[pieceType] : '#fff';

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <div className="text-xs font-black tracking-wider text-white/90 bg-black/40 px-2 py-0.5 rounded">{label}</div>
      )}
      <div
        className={`relative grid border-[3px] bg-black/70 ${dimmed ? 'opacity-60' : ''}`}
        style={{
          gridTemplateColumns: `repeat(10, ${cellPx}px)`,
          gridTemplateRows: `repeat(20, ${cellPx}px)`,
          borderColor: frameColor,
          boxShadow: `0 0 16px ${frameColor}88, inset 0 0 20px rgba(0,0,0,0.6)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isGhost = ghostSet.has(key);
            const bg = cellColor(cell);
            return (
              <div
                key={key}
                className="box-border"
                style={{
                  width: cellPx,
                  height: cellPx,
                  background: isGhost ? 'rgba(255,255,255,0.08)' : bg === 'transparent' ? 'rgba(255,255,255,0.02)' : bg,
                  border: cell !== 0 || isGhost ? '1px solid rgba(0,0,0,0.35)' : '1px solid rgba(255,255,255,0.03)',
                  boxShadow: cell !== 0 ? 'inset -3px -3px 0 rgba(0,0,0,0.25), inset 3px 3px 0 rgba(255,255,255,0.25)' : undefined,
                  outline: isGhost ? '2px dashed rgba(255,255,255,0.4)' : undefined,
                  outlineOffset: isGhost ? '-2px' : undefined,
                }}
              />
            );
          })
        )}
        {/* overlay the active piece cells with its own color, since board array doesn't include it yet */}
        {pieceCells.map(([r, c], i) => (
          <div
            key={`p-${i}`}
            className="pointer-events-none absolute box-border"
            style={{
              width: cellPx,
              height: cellPx,
              left: c * cellPx,
              top: r * cellPx,
              background: pieceColor,
              border: '1px solid rgba(0,0,0,0.4)',
              boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.25), inset 3px 3px 0 rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
