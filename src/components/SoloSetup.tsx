import { useState } from 'react';
import { t, type Lang } from '../i18n';
import type { AIDifficulty } from '../engine/ai';

interface Props {
  lang: Lang;
  onBack: () => void;
  onProceed: (mode: 'practice' | 'ai', difficulty?: AIDifficulty) => void;
}

const DIFFS: { id: AIDifficulty; key: string; color: string; icon: string }[] = [
  { id: 'easy', key: 'diffEasy', color: 'from-green-400 to-emerald-600', icon: '🙂' },
  { id: 'medium', key: 'diffMedium', color: 'from-yellow-400 to-orange-500', icon: '😤' },
  { id: 'hard', key: 'diffHard', color: 'from-orange-500 to-red-600', icon: '🔥' },
  { id: 'hell', key: 'diffHell', color: 'from-red-700 to-black', icon: '💀' },
];

export default function SoloSetup({ lang, onBack, onProceed }: Props) {
  const [mode, setMode] = useState<'practice' | 'ai'>('ai');

  return (
    <div className="relative min-h-screen w-full bg-[#1a1530] halftone-bg px-4 py-8 text-white">
      <button
        onClick={onBack}
        className="comic-border rounded-lg bg-red-500 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform"
      >
        ← {t(lang, 'back')}
      </button>

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setMode('practice')}
            className={`comic-border rounded-xl px-6 py-3 font-manga text-lg transition-transform hover:scale-105 ${
              mode === 'practice' ? 'bg-yellow-400 text-black -rotate-2' : 'bg-black/40 rotate-1'
            }`}
          >
            {t(lang, 'startPractice')}
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`comic-border rounded-xl px-6 py-3 font-manga text-lg transition-transform hover:scale-105 ${
              mode === 'ai' ? 'bg-orange-400 text-black rotate-2' : 'bg-black/40 -rotate-1'
            }`}
          >
            {t(lang, 'vsAi')}
          </button>
        </div>

        {mode === 'ai' && (
          <div className="animate-pop-in">
            <div className="mb-4 text-center font-manga text-2xl text-yellow-300">{t(lang, 'selectDifficulty')}</div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {DIFFS.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => onProceed('ai', d.id)}
                  style={{ transform: `rotate(${i % 2 === 0 ? -3 : 3}deg)` }}
                  className={`comic-border-thick rounded-xl bg-gradient-to-br ${d.color} px-3 py-6 text-center transition-all hover:scale-110 hover:rotate-0`}
                >
                  <div className="text-3xl">{d.icon}</div>
                  <div className="mt-2 font-manga text-lg drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">{t(lang, d.key)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'practice' && (
          <div className="animate-pop-in flex justify-center">
            <button
              onClick={() => onProceed('practice')}
              className="comic-border-thick rounded-xl bg-gradient-to-br from-yellow-300 to-orange-500 px-10 py-6 font-manga text-2xl text-black hover:scale-105 transition-transform"
            >
              {t(lang, 'startMatch')} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
