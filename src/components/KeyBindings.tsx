import { useEffect, useState } from 'react';
import {
  loadKeyMap,
  saveKeyMap,
  DEFAULT_KEYMAP,
  type KeyMap,
} from '../engine/storage';
import { t, type Lang } from '../i18n';

interface Props {
  lang: Lang;
}

const ACTIONS: { key: keyof KeyMap; label: string }[] = [
  { key: 'left', label: '向左移動' },
  { key: 'right', label: '向右移動' },
  { key: 'softDrop', label: '軟降' },
  { key: 'hardDrop', label: '硬降' },
  { key: 'rotateCW', label: '順時針旋轉' },
  { key: 'rotateCCW', label: '逆時針旋轉' },
  { key: 'hold', label: '保留 (Hold)' },
  { key: 'pause', label: '暫停' },
];

function formatKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === 'Escape') return 'Esc';
  if (key === 'ArrowUp') return '↑';
  if (key === 'ArrowDown') return '↓';
  if (key === 'ArrowLeft') return '←';
  if (key === 'ArrowRight') return '→';
  if (key === 'Shift') return 'Shift';
  if (key === 'Control') return 'Ctrl';
  if (key === 'Alt') return 'Alt';
  return key.length === 1 ? key.toUpperCase() : key;
}

export default function KeyBindings({ lang }: Props) {
  const [keymap, setKeymap] = useState<KeyMap>(loadKeyMap());
  const [listening, setListening] = useState<keyof KeyMap | null>(null);

  // 全域監聽，讓玩家按下按鍵時捕捉
  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 避免把 Escape 當成「取消」，改成「設定」
      const newKey = e.key;
      const next = { ...keymap, [listening]: newKey };
      setKeymap(next);
      saveKeyMap(next);
      setListening(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listening, keymap]);

  const resetDefaults = () => {
    setKeymap({ ...DEFAULT_KEYMAP });
    saveKeyMap({ ...DEFAULT_KEYMAP });
    setListening(null);
  };

  return (
    <div className="comic-border-thick rotate-1 rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-900 p-6">
      <div className="mb-3 font-manga text-xl text-teal-200">
        🎮 按鍵設定 (Key Bindings)
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setListening(key)}
            className={`comic-border rounded-lg px-3 py-2 font-manga text-xs transition-transform hover:scale-105 ${
              listening === key
                ? 'bg-yellow-300 text-black animate-pulse'
                : 'bg-black/40 text-white'
            }`}
          >
            <div className="text-[10px] text-white/70">{label}</div>
            <div className={`mt-1 text-base ${listening === key ? 'text-black' : 'text-yellow-300'}`}>
              {listening === key ? '按下按鍵...' : formatKey(keymap[key])}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={resetDefaults}
          className="comic-border rounded-lg bg-red-600 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform"
        >
          🔄 恢復預設
        </button>
        <div className="font-manga text-xs text-white/60">
          {listening ? '請按下你想設定的按鍵...' : '點擊按鈕後，按下鍵盤上的按鍵即可更改'}
        </div>
      </div>
    </div>
  );
}
