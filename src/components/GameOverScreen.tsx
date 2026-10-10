import type { EngineStats } from '../engine/types';
import { t, type Lang } from '../i18n';

type RematchState = 'idle' | 'waiting' | 'invited' | 'declined';

interface Props {
  lang: Lang;
  outcome: 'win' | 'lose' | 'draw' | null;
  myStats: EngineStats;
  oppStats?: EngineStats | null;
  characterName: string;
  onRematch: () => void;
  onMenu: () => void;
  isOnline?: boolean;
  rematchState?: RematchState;
  onRematchAccept?: () => void;
  onRematchDecline?: () => void;
}

function aggregateBreakdown(stats: EngineStats) {
  const map = new Map<string, { label: string; points: number; garbage: number; count: number }>();
  for (const b of stats.breakdown) {
    const cur = map.get(b.label) || { label: b.label, points: 0, garbage: 0, count: 0 };
    cur.points += b.points;
    cur.garbage += b.garbage;
    cur.count += 1;
    map.set(b.label, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points);
}

const COUNTER_ROWS: { key: keyof EngineStats['counters']; labelKey: string }[] = [
  { key: 'single', labelKey: 'single' },
  { key: 'double', labelKey: 'double' },
  { key: 'triple', labelKey: 'triple' },
  { key: 'tetris', labelKey: 'tetris' },
  { key: 'tspinSingle', labelKey: 'tspinSingle' },
  { key: 'tspinDouble', labelKey: 'tspinDouble' },
  { key: 'tspinTriple', labelKey: 'tspinTriple' },
  { key: 'b2b', labelKey: 'b2bCount' },
  { key: 'maxCombo', labelKey: 'maxCombo' },
  { key: 'perfectClear', labelKey: 'perfectClear' },
  { key: 'piecesPlaced', labelKey: 'piecesPlaced' },
];

export default function GameOverScreen({
  lang,
  outcome,
  myStats,
  characterName,
  onRematch,
  onMenu,
  isOnline,
  rematchState = 'idle',
  onRematchAccept,
  onRematchDecline,
}: Props) {
  const breakdown = aggregateBreakdown(myStats);
  const outcomeLabel = outcome === 'win' ? t(lang, 'youWin') : outcome === 'lose' ? t(lang, 'youLose') : outcome === 'draw' ? t(lang, 'draw') : '';
  const outcomeColor = outcome === 'win' ? 'from-yellow-300 to-orange-500' : outcome === 'lose' ? 'from-slate-500 to-slate-800' : 'from-purple-400 to-purple-700';

  return (
    <div className="relative min-h-screen w-full overflow-auto bg-[#0f0a1f] halftone-bg px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <div className="font-manga text-sm text-white/50">{t(lang, 'gameOver')} · {characterName}</div>
          {outcomeLabel && (
            <div className={`animate-pop-in mx-auto mt-2 inline-block comic-border-thick rounded-2xl bg-gradient-to-br ${outcomeColor} px-10 py-4 font-manga text-4xl sm:text-5xl text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)]`}>
              {outcomeLabel}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="comic-border-thick rounded-2xl bg-indigo-950/70 p-5">
            <div className="mb-3 font-manga text-lg text-cyan-300">{t(lang, 'actionBreakdown')}</div>
            <div className="space-y-1.5">
              {COUNTER_ROWS.map((row) => (
                <div key={row.key} className="flex items-center justify-between border-b border-white/10 pb-1 text-sm">
                  <span className="font-bold text-white/80">{t(lang, row.labelKey)}</span>
                  <span className="font-manga text-lg text-yellow-300">{myStats.counters[row.key]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="comic-border-thick rounded-2xl bg-fuchsia-950/70 p-5">
            <div className="mb-3 font-manga text-lg text-pink-300">{t(lang, 'attackBreakdown')}</div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {breakdown.length === 0 && <div className="text-sm text-white/50">—</div>}
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between border-b border-white/10 pb-1 text-sm">
                  <span className="font-bold text-white/80">{b.label} <span className="text-white/40">x{b.count}</span></span>
                  <span className="font-manga text-sm text-green-300">+{b.points} pt / {b.garbage} 🧱</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between comic-border rounded-lg bg-black/40 px-3 py-2">
              <span className="font-manga text-sm">{t(lang, 'garbageSent')}</span>
              <span className="font-manga text-xl text-red-400">{myStats.garbageSent}</span>
            </div>
            <div className="mt-2 flex items-center justify-between comic-border rounded-lg bg-black/40 px-3 py-2">
              <span className="font-manga text-sm">{t(lang, 'finalScore')}</span>
              <span className="font-manga text-2xl text-yellow-300">{myStats.score}</span>
            </div>
          </div>
        </div>

        {/* Rematch 狀態提示 */}
        {isOnline && rematchState === 'waiting' && (
          <div className="mt-6 mx-auto max-w-md animate-pulse comic-border rounded-xl bg-blue-900/70 px-6 py-4 text-center font-manga">
            ⏳ 等待對方回應...
          </div>
        )}
        {isOnline && rematchState === 'declined' && (
          <div className="mt-6 mx-auto max-w-md comic-border rounded-xl bg-red-900/70 px-6 py-4 text-center font-manga">
            ❌ 對方拒絕了再戰
          </div>
        )}

        <div className="mt-8 flex justify-center gap-5 pb-10">
          <button
            onClick={onRematch}
            disabled={isOnline && rematchState === 'waiting'}
            className={`comic-border-thick rounded-xl px-8 py-3 font-manga text-lg transition-transform ${
              isOnline && rematchState === 'waiting'
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-br from-green-400 to-emerald-600 hover:scale-105'
            }`}
          >
            🔁 {t(lang, 'rematch')}
          </button>
          <button onClick={onMenu} className="comic-border-thick rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 px-8 py-3 font-manga text-lg hover:scale-105 transition-transform">
            🏠 {t(lang, 'backToMenu')}
          </button>
        </div>
      </div>

      {/* 對方邀請彈窗 */}
      {isOnline && rematchState === 'invited' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="comic-border-thick animate-pop-in rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 p-8 text-center">
            <div className="font-manga text-2xl text-yellow-300">🔔 對方想再戰一場！</div>
            <div className="mt-2 font-manga text-sm text-white/70">是否接受挑戰？</div>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={onRematchAccept}
                className="comic-border rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 px-8 py-3 font-manga text-lg hover:scale-105 transition-transform"
              >
                ✅ 接受
              </button>
              <button
                onClick={onRematchDecline}
                className="comic-border rounded-xl bg-gradient-to-br from-red-500 to-red-700 px-8 py-3 font-manga text-lg hover:scale-105 transition-transform"
              >
                ❌ 拒絕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
