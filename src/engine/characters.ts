import type { CharacterId } from './types';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  image: string;
  color: string;
  accent: string;
  abilityName: { tc: string; en: string; sc: string };
  abilityDesc: { tc: string; en: string; sc: string };
  tagline: { tc: string; en: string; sc: string };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'godjj',
    name: 'GODJJ',
    image: '/images/char_godjj.png',
    color: '#2dd4bf',
    accent: '#a855f7',
    abilityName: { tc: '連擊風暴', en: 'Combo Storm', sc: '连击风暴' },
    abilityDesc: {
      tc: '連擊發送的垃圾行 +60%。連擊數達到 4 以上時，額外發送 1 行普通垃圾行（可被抵消）。',
      en: '+60% garbage sent from Combos. Reaching Combo ≥4 sends 1 extra normal garbage line (offsettable).',
      sc: '连击发送的垃圾行 +60%。连击数达到 4 以上时，额外发送 1 行普通垃圾行（可被抵消）。',
    },
    tagline: { tc: '鴨鴨兜帽，連擊無限！', en: 'Duck hood, combo unlimited!', sc: '鸭鸭连帽，连击无限！' },
  },
  {
    id: 'daikai4104',
    name: 'Daikai4104',
    image: '/images/char_dingyi.png', // 眼鏡男
    color: '#f59e0b',
    accent: '#111827',
    abilityName: { tc: '戰術全能王', en: 'Tactical All-Rounder', sc: '战术全能王' },
    abilityDesc: {
      tc: '完成 Tetris 或 T-Spin 時，自動清除自己盤面底部 2 行垃圾，並立即抵消 2 行待處理的垃圾。',
      en: 'Clearing a Tetris or T-Spin clears the bottom 2 rows of own garbage, and cancels 2 pending garbage lines.',
      sc: '完成 Tetris 或 T-Spin 时，自动清除自己盘面底部 2 行垃圾，并立即抵消 2 行待处理的垃圾。',
    },
    tagline: { tc: '發光眼鏡，火力全開！', en: 'Glowing shades, full firepower!', sc: '发光眼镜，火力全开！' },
  },
  {
    id: 'cg1',
    name: 'CG1',
    image: '/images/char_daikai.png', // 獅子
    color: '#eab308',
    accent: '#1f2937',
    abilityName: { tc: '重型砲擊', en: 'Heavy Artillery', sc: '重型炮击' },
    abilityDesc: {
      tc: 'Tetris 消行額外 +2 垃圾行。送出的垃圾行洞口位置固定在最左或最右側（對手更容易防禦）。',
      en: 'Tetris sends +2 bonus garbage. Garbage hole columns are fixed on the far left or right (easier to defend).',
      sc: 'Tetris 消行额外 +2 垃圾行。送出的垃圾行洞口位置固定在最左或最右侧（对手更容易防御）。',
    },
    tagline: { tc: '獅王氣場，穩如磐石！', en: 'Lion king vibes, rock solid defense!', sc: '狮王气场，稳如磐石！' },
  },
  {
    id: 'dingyi',
    name: 'Dingyi',
    image: '/images/char_cg1.png', // 柴犬廚師
    color: '#d97706',
    accent: '#7c2d12',
    abilityName: { tc: '銅牆鐵壁', en: 'Iron Wall Defense', sc: '铜墙铁壁' },
    abilityDesc: {
      tc: '垃圾行抵銷效率 +30%。使用 Hold 可清除自己 2 行垃圾（冷卻 5 秒）。',
      en: '+30% garbage offset efficiency. Using Hold clears 2 rows of own garbage (5s cooldown).',
      sc: '垃圾行抵销效率 +30%。使用 Hold 可清除自己 2 行垃圾（冷却 5 秒）。',
    },
    tagline: { tc: '柴犬主廚，甜點與方塊兼顧！', en: 'Shiba chef, cake and blocks alike!', sc: '柴犬主厨，甜点与方块兼顾！' },
  },
  {
    id: 'abao',
    name: 'Abao',
    image: '/images/char_abao.png',
    color: '#ec4899',
    accent: '#581c87',
    abilityName: { tc: 'T-Spin 大師', en: 'T-Spin Master', sc: 'T-Spin 大师' },
    abilityDesc: {
      tc: '所有 T-Spin（單/雙/三消）額外 +1 垃圾行。T-Spin Back-to-Back 時，再額外 +1 垃圾行（可被抵消）。',
      en: 'All T-Spins send +1 extra garbage. T-Spin Back-to-Back sends +1 extra garbage (offsettable).',
      sc: '所有 T-Spin（单/双/三消）额外 +1 垃圾行。T-Spin Back-to-Back 时，再额外 +1 垃圾行（可被抵消）。',
    },
    tagline: { tc: '愛睏少女，旋轉即正義！', en: 'Sleepy girl, spin is justice!', sc: '爱困少女，旋转即正义！' },
  },
];

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id)!;
}