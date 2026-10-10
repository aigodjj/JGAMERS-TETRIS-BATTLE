import { useEffect, useRef, useState } from 'react';
import { TetrisEngine } from '../engine/TetrisEngine';
import { AIController, type AIDifficulty } from '../engine/ai';
import { getCharacter } from '../engine/characters';
import { loadKeyMap } from '../engine/storage';
import type { CharacterId, EngineStats } from '../engine/types';
import type { NetPeer, NetMessage } from '../net/peer';
import BoardView from './BoardView';
import SidePanel from './SidePanel';
import { t, type Lang } from '../i18n';
import {
  playMoveSFX,
  playRotateSFX,
  playHardDropSFX,
  playHoldSFX,
  playLineClearSFX,
} from '../utils/sfx';

export type GameMode = 'practice' | 'ai' | 'online';

interface Props {
  lang: Lang;
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  peer?: NetPeer | null;
  playerChar: CharacterId;
  opponentChar: CharacterId | null;
  myNickname?: string;
  onGameOver: (outcome: 'win' | 'lose' | 'draw' | null, myStats: EngineStats) => void;
  onQuit: () => void;
}

interface RemoteSnapshot {
  board: any[][];
  pieceCells: [number, number][];
  ghostCells: [number, number][];
  pieceType: string | null;
  score: number;
  lines: number;
  combo: number;
  holdType: string | null;
  nextTypes: string[];
  pendingGarbageCount: number;
  gameOver: boolean;
  nickname?: string;
}

export default function GameScreen({ lang, mode, aiDifficulty, peer, playerChar, opponentChar, myNickname, onGameOver, onQuit }: Props) {
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [myFlash, setMyFlash] = useState(false);
  const [remoteNickname, setRemoteNickname] = useState<string>('');
  const [ping, setPing] = useState<number | null>(null);
  const finishedRef = useRef(false);

  const engineRef = useRef<TetrisEngine | null>(null);
  const oppEngineRef = useRef<TetrisEngine | null>(null);
  const aiRef = useRef<AIController | null>(null);
  const remoteRef = useRef<RemoteSnapshot | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const lastSendRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const countdownRef = useRef(3);
  const keymapRef = useRef(loadKeyMap());
  const pingTimerRef = useRef<number>(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // --- Initialize engines ---
  useEffect(() => {
    finishedRef.current = false;
    const finishMatch = (outcome: 'win' | 'lose' | 'draw' | null) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const stats = engineRef.current!.stats;
      if (mode === 'online' && peer) {
        peer.send({ type: 'gameover', stats });
      }
      setTimeout(() => onGameOver(outcome, stats), 50);
    };

    const engine = new TetrisEngine(playerChar, {
      onTopOut: () => {
        if (mode === 'ai') finishMatch('lose');
        else if (mode === 'practice') finishMatch(null);
        else if (mode === 'online') finishMatch('lose');
      },
      onAttack: (lines, holeCols, hard) => {
        if (mode === 'ai' && oppEngineRef.current) {
          oppEngineRef.current.receiveGarbage(lines, holeCols ?? undefined, hard);
        } else if (mode === 'online' && peer) {
          peer.send({ type: 'attack', lines, holeCols: holeCols ?? [], hard: !!hard });
        }
      },
      onLineClear: (info: any) => {
        if (info && info.linesCleared > 0) {
          playLineClearSFX(1, info.linesCleared);
        }
      },
    });
    engineRef.current = engine;

    if (mode === 'ai' && opponentChar) {
      const oppEngine = new TetrisEngine(opponentChar, {
        onTopOut: () => finishMatch('win'),
        onAttack: (lines, holeCols, hard) => {
          engineRef.current?.receiveGarbage(lines, holeCols ?? undefined, hard);
        },
      });
      oppEngineRef.current = oppEngine;
      aiRef.current = new AIController(oppEngine, aiDifficulty || 'medium');
    }

    if (mode === 'online' && peer) {
      peer.onData = (msg: NetMessage) => {
        if (msg.type === 'attack') {
          engineRef.current?.receiveGarbage(msg.lines, msg.holeCols, msg.hard);
        } else if (msg.type === 'state') {
          remoteRef.current = msg as unknown as RemoteSnapshot;
          if ((msg as any).nickname) {
            setRemoteNickname((msg as any).nickname);
          }
        } else if (msg.type === 'gameover') {
          if (!finishedRef.current) {
            finishMatch('win');
          }
        } else if (msg.type === 'ping') {
          // 收到對手的 Ping，立刻回傳 Pong
          peer?.send({ type: 'pong', timestamp: msg.timestamp });
        } else if (msg.type === 'pong') {
          // 收到對手的 Pong，計算延遲
          const rtt = Date.now() - msg.timestamp;
          setPing(rtt);
        }
      };
      peer.onDisconnected = () => {
        if (!finishedRef.current) finishMatch('win');
      };
    }

    return () => {
      aiRef.current?.destroy();
      if (peer) {
        peer.onData = null;
        peer.onDisconnected = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- countdown ---
  useEffect(() => {
    countdownRef.current = 3;
    setCountdown(3);
    const iv = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) clearInterval(iv);
    }, 800);
    return () => clearInterval(iv);
  }, []);

  // --- keyboard input (支援自訂按鍵) ---
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || finishedRef.current) return;
      const km = keymapRef.current;

      if (
        e.key === km.left ||
        e.key === km.right ||
        e.key === km.softDrop ||
        e.key === km.hardDrop ||
        e.key === km.rotateCW ||
        e.key === km.rotateCCW ||
        e.key === km.hold ||
        e.code === 'Space'
      ) {
        e.preventDefault();
      }

      if (e.key === km.pause) {
        setPaused((p) => !p);
        return;
      }

      if (pausedRef.current || countdownRef.current > 0) return;

      const noRepeatKeys = [km.hardDrop, km.rotateCW, km.rotateCCW, km.hold];
      if (e.repeat && noRepeatKeys.includes(e.key)) return;

      if (e.key === km.left) {
        engine.setInput('left', true);
        playMoveSFX();
      } else if (e.key === km.right) {
        engine.setInput('right', true);
        playMoveSFX();
      } else if (e.key === km.softDrop) {
        engine.setInput('softDrop', true);
      } else if (e.key === km.hardDrop) {
        engine.hardDrop();
        playHardDropSFX();
      } else if (e.key === km.rotateCW) {
        engine.rotate(1);
        playRotateSFX();
      } else if (e.key === km.rotateCCW) {
        engine.rotate(-1);
        playRotateSFX();
      } else if (e.key === km.hold) {
        engine.hold();
        playHoldSFX();
      }
    };

    const up = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const km = keymapRef.current;
      if (e.key === km.left) {
        engine.setInput('left', false);
      } else if (e.key === km.right) {
        engine.setInput('right', false);
      } else if (e.key === km.softDrop) {
        engine.setInput('softDrop', false);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // --- main loop ---
  useEffect(() => {
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(50, ts - lastTsRef.current);
      lastTsRef.current = ts;

      if (!pausedRef.current && countdownRef.current <= 0 && !finishedRef.current) {
        const engine = engineRef.current;
        const prevGarbage = engine?.stats.garbageReceived || 0;
        engine?.tick(dt);
        if (engine && engine.stats.garbageReceived !== prevGarbage) {
          setMyFlash(true);
          setTimeout(() => setMyFlash(false), 300);
        }
        if (mode === 'ai' && oppEngineRef.current && aiRef.current) {
          oppEngineRef.current.tick(dt);
          aiRef.current.update(dt);
        }
        if (mode === 'online' && peer && engine) {
          // Ping 發送（每 1 秒一次）
          pingTimerRef.current += dt;
          if (pingTimerRef.current >= 1000) {
            pingTimerRef.current = 0;
            peer.send({ type: 'ping', timestamp: Date.now() });
          }

          // 狀態同步（每 90ms 一次）
          lastSendRef.current += dt;
          if (lastSendRef.current >= 90) {
            lastSendRef.current = 0;
            const info = engine.getRenderInfo();
            peer.send({
              type: 'state',
              board: info.board,
              pieceCells: info.pieceCells,
              ghostCells: info.ghostCells,
              pieceType: info.pieceType,
              score: engine.stats.score,
              lines: engine.stats.linesCleared,
              combo: Math.max(engine.combo, 0),
              holdType: engine.holdType,
              nextTypes: engine.getNextPreview(4),
              pendingGarbageCount: info.pendingGarbageCount,
              gameOver: engine.gameOver,
              nickname: myNickname || pChar.name,
            });
          }
        }
      }
      setTick((v) => (v + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myNickname, playerChar]);

  const engine = engineRef.current;
  if (!engine) return null;
  const info = engine.getRenderInfo();
  const pChar = getCharacter(playerChar);
  const oChar = opponentChar ? getCharacter(opponentChar) : null;

  const displayPlayerName = myNickname || pChar.name;
  const displayOpponentName = remoteNickname || oChar?.name || '2P';

  let remoteInfo: RemoteSnapshot | null = null;
  if (mode === 'ai' && oppEngineRef.current) {
    const oinfo = oppEngineRef.current.getRenderInfo();
    remoteInfo = {
      board: oinfo.board,
      pieceCells: oinfo.pieceCells,
      ghostCells: oinfo.ghostCells,
      pieceType: oinfo.pieceType,
      score: oppEngineRef.current.stats.score,
      lines: oppEngineRef.current.stats.linesCleared,
      combo: Math.max(oppEngineRef.current.combo, 0),
      holdType: oppEngineRef.current.holdType,
      nextTypes: oppEngineRef.current.getNextPreview(4),
      pendingGarbageCount: oinfo.pendingGarbageCount,
      gameOver: oppEngineRef.current.gameOver,
      nickname: '',
    };
  } else if (mode === 'online') {
    remoteInfo = remoteRef.current;
  }

  const myScoreStr = engine.stats.score.toString().padStart(8, '0');
  const oppScoreStr = (remoteInfo?.score || 0).toString().padStart(8, '0');

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0d0919] px-2 py-3 pb-24 text-white">
      <div className="absolute inset-0 halftone-bg opacity-20" />
      <div className="relative z-10 flex items-center justify-between px-2">
        <div className="font-manga text-sm text-blue-300">{displayPlayerName}</div>
        <button onClick={() => setPaused((p) => !p)} className="comic-border rounded-lg bg-purple-700 px-3 py-1 font-manga text-xs hover:scale-105 transition-transform">
          {paused ? t(lang, 'resume') : t(lang, 'pause')}
        </button>
        {oChar && <div className="font-manga text-sm text-red-300">{displayOpponentName}</div>}
        {mode === 'online' && !oChar && <div className="font-manga text-sm text-red-300">2P</div>}
      </div>

      <div className="relative z-10 mt-2 flex flex-wrap items-start justify-center gap-8 lg:gap-16">

        {/* ===== 玩家區塊 ===== */}
        <div className={`flex items-start gap-2 ${myFlash ? 'animate-shake-sm' : ''}`}>

          <div className="flex flex-col items-center">
            <SidePanel lang={lang} holdType={engine.holdType} nextTypes={engine.getNextPreview(4)} score={engine.stats.score} lines={engine.stats.linesCleared} combo={Math.max(engine.combo, 0)} accent={pChar.color} />

            <div className="hidden md:block mt-2">
              <img
                src={pChar.image.replace('.png', '_cheer.png')}
                alt={pChar.name}
                className="h-[220px] lg:h-[280px] w-auto object-contain drop-shadow-2xl"
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
              />
            </div>
          </div>

          <div className="relative">
            <BoardView board={info.board} pieceCells={info.pieceCells} ghostCells={info.ghostCells} pieceType={info.pieceType} frameColor="#3b82f6" label={displayPlayerName} />

            {info.pendingGarbageCount > 0 && (
              <>
                <div className="absolute -right-3 top-0 flex h-full w-2 flex-col-reverse gap-0.5 overflow-hidden rounded bg-black/40">
                  {Array.from({ length: Math.min(info.pendingGarbageCount, 20) }).map((_, i) => (
                    <div key={i} className="h-[5%] w-full bg-red-500" />
                  ))}
                </div>

                <div className="absolute -top-14 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center rounded-lg border-2 border-red-500 bg-black/90 px-4 py-1 animate-pulse shadow-[0_0_15px_rgba(255,0,0,0.8)] whitespace-nowrap">
                  <div className="font-manga text-2xl font-bold text-red-500 drop-shadow-[0_0_8px_rgba(255,0,0,1)]">
                    {info.pendingGarbageCount}
                  </div>
                  <div className="font-manga text-[10px] text-red-300">INCOMING</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== 對手區塊 ===== */}
        {(mode !== 'practice') && (
          <div className="flex items-start gap-2 opacity-90">
            <div className="relative">
              <BoardView
                board={remoteInfo?.board ?? Array.from({ length: 20 }, () => Array(10).fill(0))}
                pieceCells={remoteInfo?.pieceCells ?? []}
                ghostCells={remoteInfo?.ghostCells ?? []}
                pieceType={(remoteInfo?.pieceType as any) ?? null}
                frameColor="#ef4444"
                label={displayOpponentName}
              />
              {remoteInfo && remoteInfo.pendingGarbageCount > 0 && (
                <>
                  <div className="absolute -right-4 top-0 flex h-full w-3 flex-col-reverse gap-0.5 overflow-hidden rounded bg-black/40">
                    {Array.from({ length: Math.min(remoteInfo.pendingGarbageCount, 20) }).map((_, i) => (
                      <div key={i} className="h-[5%] w-full bg-orange-500" />
                    ))}
                  </div>
                  <div className="absolute -top-14 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center rounded-lg border-2 border-orange-500 bg-black/90 px-4 py-1 animate-pulse shadow-[0_0_15px_rgba(255,165,0,0.8)] whitespace-nowrap">
                    <div className="font-manga text-2xl font-bold text-orange-400 drop-shadow-[0_0_8px_rgba(255,165,0,1)]">
                      {remoteInfo.pendingGarbageCount}
                    </div>
                    <div className="font-manga text-[10px] text-orange-300">SENT</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center">
              <SidePanel
                lang={lang}
                holdType={(remoteInfo?.holdType as any) ?? null}
                nextTypes={(remoteInfo?.nextTypes as any) ?? []}
                score={remoteInfo?.score ?? 0}
                lines={remoteInfo?.lines ?? 0}
                combo={remoteInfo?.combo ?? 0}
                accent={oChar?.color || '#ef4444'}
              />

              {oChar && (
                <div className="hidden md:block mt-2">
                  <img
                    src={oChar.image.replace('.png', '_cheer.png')}
                    alt={oChar.name}
                    className="h-[220px] lg:h-[280px] w-auto object-contain drop-shadow-2xl"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部 Puyo Puyo 風格狀態欄 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-20 items-center justify-between border-t-4 border-black bg-[#1a1a2e]/95 px-4 md:px-12 font-manga shadow-[0_-4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-900/50 text-xl text-blue-300">
            P1
          </div>
          <div>
            <div className="text-xs text-blue-300 md:text-sm truncate max-w-[100px] md:max-w-[200px]">{displayPlayerName}</div>
            <div className="text-2xl font-bold tracking-wider text-yellow-300 drop-shadow-[0_0_8px_rgba(255,255,0,0.5)] md:text-4xl">
              {myScoreStr}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-400 md:text-3xl italic">VS</div>
          {mode === 'online' && (
            <div className={`mt-1 font-manga text-xs md:text-sm ${
              ping === null ? 'text-gray-500' :
              ping < 80 ? 'text-green-400' :
              ping < 150 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {ping === null ? 'PING: ---' : `PING: ${ping}ms`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-red-300 md:text-sm truncate max-w-[100px] md:max-w-[200px]">{displayOpponentName}</div>
            <div className="text-2xl font-bold tracking-wider text-orange-400 drop-shadow-[0_0_8px_rgba(255,165,0,0.5)] md:text-4xl">
              {oppScoreStr}
            </div>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 bg-red-900/50 text-xl text-red-300">
            2P
          </div>
        </div>
      </div>

      {countdown > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="animate-pop-in font-manga text-9xl text-yellow-300 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
            {countdown}
          </div>
        </div>
      )}

      {paused && countdown <= 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="comic-border-thick flex flex-col items-center gap-4 rounded-2xl bg-purple-900 p-10">
            <div className="font-manga text-3xl text-yellow-300">{t(lang, 'pause')}</div>
            <button onClick={() => setPaused(false)} className="comic-border rounded-lg bg-green-500 px-6 py-2 font-manga text-lg hover:scale-105 transition-transform">
              {t(lang, 'resume')}
            </button>
            <button onClick={onQuit} className="comic-border rounded-lg bg-red-600 px-6 py-2 font-manga text-lg hover:scale-105 transition-transform">
              {t(lang, 'quitToMenu')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
