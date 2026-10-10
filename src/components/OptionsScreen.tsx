import { useState } from 'react';
import { t, LANG_LABELS, type Lang } from '../i18n';
import { loadStats, saveStats, type GameStats } from '../engine/storage';
import KeyBindings from './KeyBindings';

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  onBack: () => void;
  bgmVol: number;
  sfxVol: number;
  setBgmVol: (v: number) => void;
  setSfxVol: (v: number) => void;
}

export default function OptionsScreen({ 
  lang, 
  setLang, 
  onBack, 
  bgmVol, 
  sfxVol, 
  setBgmVol, 
  setSfxVol 
}: Props) {
  const [stats, setStats] = useState<GameStats>(loadStats());

  const resetStats = () => {
    const fresh = { totalMatches: 0, wins: 0, losses: 0, bestScore: 0 };
    saveStats(fresh);
    setStats(fresh);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#1a1530] halftone-bg px-4 py-8 text-white">
      <button onClick={onBack} className="comic-border rounded-lg bg-red-500 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform">
        ← {t(lang, 'back')}
      </button>

      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        {/* 語言切換 */}
        <div className="comic-border-thick -rotate-1 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-900 p-6">
          <div className="mb-3 font-manga text-xl text-yellow-300">{t(lang, 'language')}</div>
          <div className="flex gap-3">
            {(['tc', 'en', 'sc'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`comic-border rounded-lg px-4 py-2 font-manga text-sm transition-transform hover:scale-105 ${
                  lang === l ? 'bg-yellow-300 text-black' : 'bg-black/40'
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* 音量控制 */}
        <div className="comic-border-thick rotate-1 rounded-2xl bg-gradient-to-br from-fuchsia-700 to-purple-900 p-6">
          <div className="mb-3 font-manga text-xl text-pink-200">{t(lang, 'soundVolume')}</div>
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.05} 
            value={sfxVol} 
            onChange={(e) => setSfxVol(Number(e.target.value))} 
            className="w-full accent-pink-400" 
          />

          <div className="mt-4 mb-3 font-manga text-xl text-pink-200">{t(lang, 'musicVolume')}</div>
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.05} 
            value={bgmVol} 
            onChange={(e) => setBgmVol(Number(e.target.value))} 
            className="w-full accent-pink-400" 
          />
        </div>

        {/* 統計數據 */}
        <div className="comic-border-thick -rotate-1 rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-900 p-6">
          <div className="mb-3 font-manga text-xl text-cyan-200">{t(lang, 'statsTitle')}</div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="comic-border rounded-lg bg-black/40 p-3">
              <div className="text-[10px] font-bold text-white/60">{t(lang, 'totalMatches')}</div>
              <div className="font-manga text-2xl text-white">{stats.totalMatches}</div>
            </div>
            <div className="comic-border rounded-lg bg-black/40 p-3">
              <div className="text-[10px] font-bold text-white/60">{t(lang, 'totalWins')}</div>
              <div className="font-manga text-2xl text-green-400">{stats.wins}</div>
            </div>
            <div className="comic-border rounded-lg bg-black/40 p-3">
              <div className="text-[10px] font-bold text-white/60">{t(lang, 'totalLosses')}</div>
              <div className="font-manga text-2xl text-red-400">{stats.losses}</div>
            </div>
            <div className="comic-border rounded-lg bg-black/40 p-3">
              <div className="text-[10px] font-bold text-white/60">{t(lang, 'bestScore')}</div>
              <div className="font-manga text-2xl text-yellow-300">{stats.bestScore}</div>
            </div>
          </div>
          <button onClick={resetStats} className="comic-border mt-4 rounded-lg bg-red-600 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform">
            🗑️ {t(lang, 'resetStats')}
          </button>
        </div>

        {/* 操作說明 */}
        <div className="comic-border-thick rotate-1 rounded-2xl bg-gradient-to-br from-orange-600 to-red-800 p-6">
          <div className="mb-2 font-manga text-xl text-yellow-200">{t(lang, 'controls')}</div>
          <div className="text-sm font-bold text-white/90">{t(lang, 'controlsDesc')}</div>
        </div>

        {/* 按鍵設定 */}
        <KeyBindings lang={lang} />

      </div>
    </div>
  );
}
