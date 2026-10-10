// src/components/ClickSoundPlayer.tsx
import { useEffect, useRef } from 'react';

interface Props {
  src?: string; // 音效檔案路徑
  volume: number; // 新增音量 prop
}

export default function ClickSoundPlayer({ src = '/audio/click.mp3', volume }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.volume = volume; // 初始音量

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      
      if (button && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      if (audioRef.current) {
        audioRef.current.src = '';
      }
    };
  }, [src]); // 依賴 src

  // 監聽音量變化，即時更新
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return null;
}