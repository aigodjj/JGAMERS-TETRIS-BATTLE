import { PIECE_SHAPES, PIECE_COLORS } from '../engine/srs';
import type { PieceType } from '../engine/types';
import { t, type Lang } from '../i18n';

function MiniPiece({ type }: { type: PieceType | null }) {
  if (!type) return <div className="h-10 w-16" />;
  const cells = PIECE_SHAPES[type][0];
  const maxX = Math.max(...cells.map((c) => c[0]));
  const maxY = Math.max(...cells.map((c) => c[1]));
  const size = 10;
  return (
    <div
      className="relative"
      style={{ width: (maxX + 1) * size, height: (maxY + 1) * size }}
    >
      {cells.map(([x, y], i) => (
        <div
          key={i}
          className="absolute box-border border border-black/40"
          style={{
            width: size,
            height: size,
            left: x * size,
            top: y * size,
            background: PIECE_COLORS[type],
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  lang: Lang;
  holdType: PieceType | null;
  nextTypes: PieceType[];
  score: number;
  lines: number;
  combo: number;
  accent: string;
}

export default function SidePanel({ lang, holdType, nextTypes, score, lines, combo, accent }: Props) {
  return (
    <div className="flex flex-col gap-2 text-white w-20 sm:w-24">
      <div className="rounded-lg border-2 border-white/30 bg-black/50 p-1.5 text-center">
        <div className="text-[9px] font-black tracking-widest text-white/70">{t(lang, 'hold')}</div>
        <div className="flex h-10 items-center justify-center">
          <MiniPiece type={holdType} />
        </div>
      </div>
      <div className="rounded-lg border-2 border-white/30 bg-black/50 p-1.5 text-center">
        <div className="text-[9px] font-black tracking-widest text-white/70">{t(lang, 'next')}</div>
        <div className="flex flex-col items-center gap-1 py-1">
          {nextTypes.slice(0, 4).map((p, i) => (
            <MiniPiece key={i} type={p} />
          ))}
        </div>
      </div>
      <div className="rounded-lg border-2 p-1.5 text-center" style={{ borderColor: accent, background: 'rgba(0,0,0,0.5)' }}>
        <div className="text-[9px] font-black tracking-widest text-white/70">{t(lang, 'score')}</div>
        <div className="text-sm font-black" style={{ color: accent }}>{score}</div>
        <div className="mt-1 text-[9px] font-black tracking-widest text-white/70">{t(lang, 'lines')}</div>
        <div className="text-sm font-black">{lines}</div>
        {combo > 0 && (
          <div className="mt-1 animate-pulse text-[10px] font-black text-yellow-300">{t(lang, 'combo')} x{combo}</div>
        )}
      </div>
    </div>
  );
}
