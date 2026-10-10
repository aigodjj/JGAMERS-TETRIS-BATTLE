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
import type { NetPeer, NetMessage } from './net/peer';
import type { Lang } from './i18n';

type Screen = 'menu' | 'solo' | 'online' | 'options' | 'charselect' | 'game' | 'gameover';

type RematchState = 'idle' | 'waiting' | 'invited' | 'declined';

interface MatchSetup {
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  peer?: NetPeer | null;
  isHost?: boolean;
  myNickname?: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [lang, setLangState] = useState<Lang>('en');
  const [matchSetup, setMatchSetup] = useState<MatchSetup | null>(null);
  const [playerChar, setPlayerChar] = useState<CharacterId>('godjj');
  const [opponentChar, setOpponentChar] = useState<CharacterId | null>(null);
  const [lastOutcome, setLastOutcome] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [lastStats, setLastStats] = useState<EngineStats | null>(null);
  const [rematchState, setRematchState] = useState<RematchState>('idle');

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

  useEffect(() => {
    setLangState(loadLang());
  }, []);

  // 當進入 gameover 畫面時，重新綁定 peer.onData 來監聽 rematch 相關訊息
  useEffect(() => {
    if (screen !== 'gameover' || matchSetup?.mode !== 'online' || !matchSetup.peer) return;
    const peer = matchSetup.peer;
    const prevOnData = peer.onData;

    peer.onData = (msg: NetMessage) => {
      if (msg.type === 'rematch-request') {
        setRematchState('invited');
      } else if (msg.type === 'rematch-accept') {
        setRematchState('idle');
        setScreen('charselect');
      } else if (msg.type === 'rematch-decline') {
        setRematchState('declined');
      }
    };

    return () => {
      peer.onData = prevOnData;
    };
  }, [screen, matchSetup]);

  const setLang = (l: Lang) => {
    setLangState(l);
    saveLang(l);
  };

  const goMenu = () => {
    matchSetup?.peer?.destroy();
    setMatchSetup(null);
    setRematchState('idle');
    setScreen('menu');
  };

  const handleNavigate = (target: 'solo' | 'online' | 'options') => setScreen(target);

  const handleSoloProceed = (mode: 'practice' | 'ai', difficulty?: AIDifficulty) => {
    setMatchSetup({ mode, aiDifficulty: difficulty });
    setScreen('charselect');
  };

  const handleOnlineConnected = (peer: NetPeer, isHost: boolean, nickname: string) => {
    setMatchSetup({ mode: 'online', peer, isHost, myNickname: nickname });
    setScreen('charselect');
  };

  const handleCharConfirm = (pChar: CharacterId, oChar: CharacterId | null) => {
    setPlayerChar(pChar);
    setOpponentChar(oChar);
    setRematchState('idle');
    setScreen('game');
  };

  const handleGameOver = (outcome: 'win' | 'lose' | 'draw' | null, stats: EngineStats) => {
    setLastOutcome(outcome);
    setLastStats(stats);
    setRematchState('idle');
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
    if (matchSetup.mode === 'online' && matchSetup.peer) {
      // 線上對戰：發送請求，等待對方回應
      matchSetup.peer.send({ type: 'rematch-request' });
      setRematchState('waiting');
    } else {
      // AI / 練習模式：直接進入選角
      setScreen('charselect');
    }
  };

  const handleRematchAccept = () => {
    if (!matchSetup?.peer) return;
    matchSetup.peer.send({ type: 'rematch-accept' });
    setRematchState('idle');
    setScreen('charselect');
  };

  const handleRematchDecline = () => {
    if (!matchSetup?.peer) return;
    matchSetup.peer.send({ type: 'rematch-decline' });
    setRematchState('idle');
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
          isOnline={matchSetup?.mode === 'online'}
          rematchState={rematchState}
          onRematchAccept={handleRematchAccept}
          onRematchDecline={handleRematchDecline}
        />
      )}

      <div className="fixed bottom-24 right-4 z-50">
        <BgmPlayer isGameScreen={false} volume={bgmVol} />
      </div>

      <ClickSoundPlayer volume={sfxVol} />
    </div>
  );
}
