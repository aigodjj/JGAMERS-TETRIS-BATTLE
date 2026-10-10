// src/components/BgmPlayer.tsx
import { useRef, useState, useEffect } from 'react';

interface Props {
  isGameScreen: boolean;
  volume: number; // 新增音量 prop
}

export default function BgmPlayer({ isGameScreen, volume }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const audio = new Audio('/audio/bgm_lobby.mp3');
    audio.loop = true;
    audio.volume = volume; // 初始音量
    audioRef.current = audio;

    const startBgmOnFirstClick = () => {
      if (!userPaused && !isGameScreen) {
        audio.play().then(() => setIsPlaying(true)).catch((e) => console.log('BGM 播放失敗:', e));
      }
      document.removeEventListener('click', startBgmOnFirstClick);
    };
    
    document.addEventListener('click', startBgmOnFirstClick);

    return () => {
      audio.pause();
      audio.src = '';
      document.removeEventListener('click', startBgmOnFirstClick);
    };
  }, []); // 只在第一次載入時建立

  // 監聽音量變化，即時更新
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 監聽 isGameScreen 變化
  useEffect(() => {
    if (!audioRef.current) return;
    if (isGameScreen) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (!userPaused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isGameScreen, userPaused]);

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setUserPaused(true);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      setUserPaused(false);
    }
  };

  return (
    <button
      onClick={toggleBgm}
      className="rounded-xl border-4 border-black bg-yellow-400 px-3 py-1.5 font-manga text-xs text-black hover:scale-105 transition-transform"
    >
      {isPlaying ? '🔊 BGM ON' : '🔇 BGM OFF'}
    </button>
  );
}