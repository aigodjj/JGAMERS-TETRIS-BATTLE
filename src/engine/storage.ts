import type { Lang } from '../i18n';

export interface GameStats {
  totalMatches: number;
  wins: number;
  losses: number;
  bestScore: number;
}

const STATS_KEY = 'jgamers_tetris_stats_v1';
const LANG_KEY = 'jgamers_tetris_lang_v1';
const OPTS_KEY = 'jgamers_tetris_opts_v1';

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { totalMatches: 0, wins: 0, losses: 0, bestScore: 0 };
}

export function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

export function recordMatch(win: boolean | null, score: number) {
  const stats = loadStats();
  stats.totalMatches += 1;
  if (win === true) stats.wins += 1;
  else if (win === false) stats.losses += 1;
  stats.bestScore = Math.max(stats.bestScore, score);
  saveStats(stats);
  return stats;
}

export function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === 'tc' || raw === 'en' || raw === 'sc') return raw;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export interface GameOptions {
  sfxVolume: number;
  musicVolume: number;
}

export function loadOptions(): GameOptions {
  try {
    const raw = localStorage.getItem(OPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { sfxVolume: 0.7, musicVolume: 0.5 };
}

export function saveOptions(opts: GameOptions) {
  try {
    localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
  } catch {
    /* ignore */
  }
}

// ============================================================
// 按鍵設定
// ============================================================

export interface KeyMap {
  left: string;
  right: string;
  softDrop: string;
  hardDrop: string;
  rotateCW: string;
  rotateCCW: string;
  hold: string;
  pause: string;
}

export const DEFAULT_KEYMAP: KeyMap = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: ' ',
  rotateCW: 'ArrowUp',
  rotateCCW: 'z',
  hold: 'c',
  pause: 'Escape',
};

const KEYMAP_KEY = 'jgamers_tetris_keymap_v1';

export function loadKeyMap(): KeyMap {
  try {
    const raw = localStorage.getItem(KEYMAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_KEYMAP, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_KEYMAP };
}

export function saveKeyMap(map: KeyMap) {
  try {
    localStorage.setItem(KEYMAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
