import { useEffect, useState } from 'react';
import {
  loadKeyMap,
  saveKeyMap,
  DEFAULT_KEYMAP,
  type KeyMap,
} from '../engine/storage';

interface Props {
  lang: string;
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

// 統一轉成小寫，避免大小寫問題
function normalizeKey(key: string): string {
  if (key === ' ') return ' ';
  if (key === 'Escape') return 'escape';
  if (key === 'ArrowUp') return 'arrowup';
  if (key === 'ArrowDown') return 'arrowdown';
  if (key === 'ArrowLeft') return 'arrowleft';
  if (key === 'ArrowRight') return 'arrowright';
  if (key.startsWith('Arrow')) return key.toLowerCase();
  if (key === 'Shift') return 'shift';
  if (key === 'Control') return 'control';
  if (key === 'Alt') return 'alt';
  return key.toLowerCase();
}

function formatKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === 'escape') return 'Esc';
  if (key === 'arrowup') return '↑';
  if (key === 'arrowdown') return '↓';
  if (key === 'arrowleft') return '←';
  if (key === 'arrowright') return '→';
  if (key === 'shift') return 'Shift';
  if (key === 'control') return 'Ctrl';
  if (key === 'alt') return 'Alt';
  return key.length === 1 ? key.toUpperCase() : key;
}

export default function KeyBindings({ lang }: Props) {
  const [keymap, setKeymap] = useState<KeyMap>(() => {
    // 載入時也做一次正規化
    const loaded = loadKeyMap();
    const normalized = { ...loaded };
    (Object.keys(normalized) as (keyof KeyMap)[]).forEach((k) => {
      normalized[k] = normalizeKey(normalized[k]);
    });
    saveKeyMap(normalized);
    return normalized;
  });
  const [listening, setListening] = useState<keyof KeyMap | null>(null);
  const [warning, setWarning] = useState<string>('');

  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newKey = normalizeKey(e.key);
      
      // 檢查是否與其他功能衝突
      const next = { ...keymap };
      (Object.keys(next) as (keyof KeyMap)[]).forEach((k) => {
        if (k !== listening && next[k] === newKey) {
          // 衝突！把其他功能重置為預設值
          next[k] = DEFAULT_KEYMAP[k];
          setWarning(`「${formatKey(newKey)}」原本是「${ACTIONS.find((a) => a.key === k)?.label}」的按鍵，已自動重置為預設值。`);
        }
      });
      
      next[listening] = newKey;
      setKeymap(next);
      saveKeyMap(next);
      setListening(null);
      
      // 3 秒後清除警告
      setTimeout(() => setWarning(''), 3000);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listening, keymap]);

  const resetDefaults = () => {
    setKeymap({ ...DEFAULT_KEYMAP });
    saveKeyMap({ ...DEFAULT_KEYMAP });
    setListening(null);
    setWarning('已恢復所有按鍵為預設值');
    setTimeout(() => setWarning(''), 2000);
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
      {warning && (
        <div className="mt-3 animate-pulse rounded-lg border-2 border-yellow-400 bg-yellow-900/50 px-3 py-2 font-manga text-xs text-yellow-200">
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
}
