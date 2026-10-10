import ClickSoundPlayer from './components/ClickSoundPlayer';
import BgmPlayer from './components/BgmPlayer';
import { useEffect, useState } from 'react';
import MainMenu from './components/MainMenu';
import SoloSetup from './components/SoloSetup';
import OnlineLobby from './components/OnlineLobby';
import OptionsScreen from './components/OptionsScreen';
import CharacterSelect from './components/CharacterSelect';
import GameScreen, { type GameMode } from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import { loadLang, saveLang, recordMatch } from './engine/storage';
import { getCharacter } from './engine/characters';
import type { CharacterId, EngineStats } from './engine/types';
import type { AIDifficulty } from './engine/ai';
import type { NetPeer } from './net/peer';
import type { Lang } from './i18n';

type Screen = 'menu' | 'solo' | 'online' | 'options' | 'charselect' | 'game' | 'gameover';

interface MatchSetup {
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  peer?: NetPeer | null;
  isHost?: boolean;
  myNickname?: string; // 新增：儲存玩家暱稱
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [lang, setLangState] = useState<Lang>('en');
  const [matchSetup, setMatchSetup] = useState<MatchSetup | null>(null);
  const [playerChar, setPlayerChar] = useState<CharacterId>('godjj');
  const [opponentChar, setOpponentChar] = useState<CharacterId | null>(null);
  const [lastOutcome, setLastOutcome] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [lastStats, setLastStats] = useState<EngineStats | null>(null);

  // === 全域音量狀態 ===
  const [bgmVol, setBgmVol] = useState(() => parseFloat(localStorage.getItem('bgmVol') || '0.5'));
  const [sfxVol, setSfxVol] = useState(() => parseFloat(localStorage.getItem('sfxVol') || '0.5'));

  const handleBgmVol = (v: number) => {
    setBgmVol(v);
    localStorage.setItem('bgmVol', v.toString());
  };

  const handleSfxVol = (v: number) => {
    setSfxVol(v);
    localStorage.setItem('sfxVol', v.toString());
  };
  // =========================================================

  useEffect(() => {
    setLangState(loadLang());
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    saveLang(l);
  };

  const goMenu = () => {
    matchSetup?.peer?.destroy();
    setMatchSetup(null);
    setScreen('menu');
  };

  const handleNavigate = (target: 'solo' | 'online' | 'options') => setScreen(target);

  const handleSoloProceed = (mode: 'practice' | 'ai', difficulty?: AIDifficulty) => {
    setMatchSetup({ mode, aiDifficulty: difficulty });
    setScreen('charselect');
  };

  // 修正：接收 OnlineLobby 傳來的 nickname 並存進 matchSetup
  const handleOnlineConnected = (peer: NetPeer, isHost: boolean, nickname: string) => {
    setMatchSetup({ mode: 'online', peer, isHost, myNickname: nickname });
    setScreen('charselect');
  };

  const handleCharConfirm = (pChar: CharacterId, oChar: CharacterId | null) => {
    setPlayerChar(pChar);
    setOpponentChar(oChar);
    setScreen('game');
  };

  const handleGameOver = (outcome: 'win' | 'lose' | 'draw' | null, stats: EngineStats) => {
    setLastOutcome(outcome);
    setLastStats(stats);
    if (matchSetup?.mode !== 'practice') {
      recordMatch(outcome === 'win' ? true : outcome === 'lose' ? false : null, stats.score);
    } else {
      recordMatch(null, stats.score);
    }
    setScreen('gameover');
  };

  const handleRematch = () => {
    if (!matchSetup) {
      goMenu();
      return;
    }
    if (matchSetup.mode === 'online') {
      setScreen('charselect');
    } else {
      setScreen('charselect');
    }
  };

  return (
    <div className="min-h-screen w-full">
      {screen === 'menu' && <MainMenu lang={lang} setLang={setLang} onNavigate={handleNavigate} />}

      {screen === 'solo' && (
        <SoloSetup lang={lang} onBack={() => setScreen('menu')} onProceed={handleSoloProceed} />
      )}

      {screen === 'online' && (
        <OnlineLobby lang={lang} onBack={() => setScreen('menu')} onConnected={handleOnlineConnected} />
      )}

      {screen === 'options' && (
        <OptionsScreen
          lang={lang}
          setLang={setLang}
          onBack={() => setScreen('menu')}
          bgmVol={bgmVol}
          sfxVol={sfxVol}
          setBgmVol={handleBgmVol}
          setSfxVol={handleSfxVol}
        />
      )}

      {screen === 'charselect' && matchSetup && (
        <CharacterSelect
          lang={lang}
          mode={matchSetup.mode}
          peer={matchSetup.peer}
          onBack={() => {
            matchSetup.peer?.destroy();
            setScreen('menu');
          }}
          onConfirm={handleCharConfirm}
        />
      )}

      {screen === 'game' && matchSetup && (
        <GameScreen
          lang={lang}
          mode={matchSetup.mode}
          aiDifficulty={matchSetup.aiDifficulty}
          peer={matchSetup.peer}
          playerChar={playerChar}
          opponentChar={opponentChar}
          myNickname={matchSetup.myNickname}
          onGameOver={handleGameOver}
          onQuit={goMenu}
        />
      )}

      {screen === 'gameover' && lastStats && (
        <GameOverScreen
          lang={lang}
          outcome={lastOutcome}
          myStats={lastStats}
          characterName={getCharacter(playerChar).name}
          onRematch={handleRematch}
          onMenu={goMenu}
        />
      )}

      {/* BGM 播放器：固定在右下角 */}
      <div className="fixed bottom-24 right-4 z-50">
        <BgmPlayer isGameScreen={false} volume={bgmVol} />
      </div>
      
      {/* 全域點擊音效 */}
      <ClickSoundPlayer volume={sfxVol} />
      
    </div>
  );
}