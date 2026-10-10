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
    abilityName: { tc: '連擊加成', en: 'Combo Bonus', sc: '连击加成' },
    abilityDesc: {
      tc: '連擊發送的垃圾行 +20%。',
      en: '+20% garbage sent from Combos.',
      sc: '连击发送的垃圾行 +20%。',
    },
    tagline: { tc: '鴨鴨兜帽，連擊無限！', en: 'Duck hood, combo unlimited!', sc: '鸭鸭连帽，连击无限！' },
  },
  {
    id: 'daikai4104',
    name: 'Daikai4104',
    image: '/images/char_dingyi.png',
    color: '#f59e0b',
    accent: '#111827',
    abilityName: { tc: '戰術修復', en: 'Tactical Repair', sc: '战术修复' },
    abilityDesc: {
      tc: '完成 Tetris 或 T-Spin 時，清除自己盤面底部 1 行垃圾。',
      en: 'Clearing a Tetris or T-Spin clears 1 row of own garbage.',
      sc: '完成 Tetris 或 T-Spin 时，清除自己盘面底部 1 行垃圾。',
    },
    tagline: { tc: '發光眼鏡，火力全開！', en: 'Glowing shades, full firepower!', sc: '发光眼镜，火力全开！' },
  },
  {
    id: 'cg1',
    name: 'CG1',
    image: '/images/char_daikai.png',
    color: '#eab308',
    accent: '#1f2937',
    abilityName: { tc: '重型砲擊', en: 'Heavy Artillery', sc: '重型炮击' },
    abilityDesc: {
      tc: 'Tetris 消行額外 +1 垃圾行。',
      en: 'Tetris sends +1 bonus garbage.',
      sc: 'Tetris 消行额外 +1 垃圾行。',
    },
    tagline: { tc: '獅王氣場，穩如磐石！', en: 'Lion king vibes, rock solid defense!', sc: '狮王气场，稳如磐石！' },
  },
  {
    id: 'dingyi',
    name: 'Dingyi',
    image: '/images/char_cg1.png',
    color: '#d97706',
    accent: '#7c2d12',
    abilityName: { tc: '銅牆鐵壁', en: 'Iron Wall Defense', sc: '铜墙铁壁' },
    abilityDesc: {
      tc: '垃圾行抵銷效率 +15%。使用 Hold 可清除自己 1 行垃圾（冷卻 8 秒）。',
      en: '+15% garbage offset efficiency. Using Hold clears 1 row of own garbage (8s cooldown).',
      sc: '垃圾行抵销效率 +15%。使用 Hold 可清除自己 1 行垃圾（冷却 8 秒）。',
    },
    tagline: { tc: '柴犬主廚，甜點與方塊兼顧！', en: 'Shiba chef, cake and blocks alike!', sc: '柴犬主厨，甜点与方块兼顾！' },
  },
  {
    id: 'abao',
    name: 'Abao',
    image: '/images/char_abao.png',
    color: '#ec4899',
    accent: '#581c87',
    abilityName: { tc: 'T-Spin 愛好者', en: 'T-Spin Enthusiast', sc: 'T-Spin 爱好者' },
    abilityDesc: {
      tc: '所有 T-Spin（單/雙/三消）額外 +1 垃圾行。',
      en: 'All T-Spins send +1 extra garbage.',
      sc: '所有 T-Spin（单/双/三消）额外 +1 垃圾行。',
    },
    tagline: { tc: '愛睏少女，旋轉即正義！', en: 'Sleepy girl, spin is justice!', sc: '爱困少女，旋转即正义！' },
  },
];

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id)!;
}
