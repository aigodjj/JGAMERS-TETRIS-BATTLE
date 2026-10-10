import { useRef, useState } from 'react';
import { t, type Lang } from '../i18n';
import { NetPeer } from '../net/peer';

interface Props {
  lang: Lang;
  onBack: () => void;
  onConnected: (peer: NetPeer, isHost: boolean, nickname: string) => void;
}

export default function OnlineLobby({ lang, onBack, onConnected }: Props) {
  const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const peerRef = useRef<NetPeer | null>(null);

  // 取得最終使用的暱稱（如果沒填就用預設值）
  const getFinalNickname = () => nickname.trim() || 'Player';

  const startHost = async () => {
    setMode('host');
    setStatus(t(lang, 'waitingOpponent'));
    setError('');
    const peer = new NetPeer();
    peerRef.current = peer;
    // 把暱稱傳給 onConnected
    peer.onConnected = () => onConnected(peer, true, getFinalNickname());
    peer.onError = (e) => setError(e);
    try {
      const c = await peer.host();
      setCode(c);
    } catch {
      setError('connection-error');
    }
  };

  const startJoin = () => {
    setMode('join');
    setError('');
  };

  const doJoin = async () => {
    if (!joinInput.trim()) return;
    setStatus(t(lang, 'connecting'));
    setError('');
    const peer = new NetPeer();
    peerRef.current = peer;
    // 把暱稱傳給 onConnected
    peer.onConnected = () => onConnected(peer, false, getFinalNickname());
    peer.onError = (e) => setError(e);
    try {
      await peer.join(joinInput);
    } catch {
      setError('connection-error');
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#101225] halftone-bg px-4 py-8 text-white">
      <button
        onClick={() => {
          peerRef.current?.destroy();
          onBack();
        }}
        className="comic-border rounded-lg bg-red-500 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform"
      >
        ← {t(lang, 'back')}
      </button>

      <div className="mx-auto mt-16 max-w-xl text-center">
        {/* === 暱稱輸入欄位（所有模式共用） === */}
        <div className="animate-pop-in mb-8 comic-border-thick rounded-2xl bg-gradient-to-br from-amber-600 to-orange-800 p-6">
          <div className="mb-3 font-manga text-lg text-yellow-200">
            🎮 你的暱稱 / Your Nickname
          </div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 12))}
            maxLength={12}
            placeholder="輸入暱稱（最多 12 字）"
            className="w-full max-w-xs rounded-lg border-4 border-black bg-white px-4 py-2 text-center font-manga text-xl text-black outline-none"
          />
          <div className="mt-2 font-manga text-xs text-white/70">
            {nickname.length}/12
          </div>
        </div>

        {mode === 'choose' && (
          <div className="animate-pop-in flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <button
              onClick={startHost}
              className="comic-border-thick -rotate-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 px-8 py-8 font-manga text-2xl hover:scale-105 hover:rotate-0 transition-transform"
            >
              🛰️ {t(lang, 'hostGame')}
            </button>
            <button
              onClick={startJoin}
              className="comic-border-thick rotate-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-700 px-8 py-8 font-manga text-2xl hover:scale-105 hover:rotate-0 transition-transform"
            >
              🔑 {t(lang, 'joinGame')}
            </button>
          </div>
        )}

        {mode === 'host' && (
          <div className="animate-pop-in comic-border-thick rounded-2xl bg-blue-900/60 p-8">
            <div className="font-manga text-lg text-blue-200">{t(lang, 'roomCode')}</div>
            {code ? (
              <>
                <div className="my-4 font-manga text-5xl tracking-widest text-yellow-300">{code}</div>
                <button
                  onClick={copyCode}
                  className="comic-border rounded-lg bg-yellow-400 px-4 py-2 font-manga text-sm text-black hover:scale-105 transition-transform"
                >
                  {copied ? t(lang, 'copied') : t(lang, 'copyCode')}
                </button>
              </>
            ) : (
              <div className="my-6 animate-pulse font-manga text-xl">{t(lang, 'connecting')}</div>
            )}
            <div className="mt-6 animate-pulse font-manga text-sm text-white/70">{status}</div>
          </div>
        )}

        {mode === 'join' && (
          <div className="animate-pop-in comic-border-thick rounded-2xl bg-fuchsia-900/60 p-8">
            <div className="mb-3 font-manga text-lg text-fuchsia-200">{t(lang, 'enterCode')}</div>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              maxLength={5}
              className="w-48 rounded-lg border-4 border-black bg-white px-4 py-2 text-center font-manga text-2xl tracking-widest text-black outline-none"
              placeholder="XXXXX"
            />
            <div className="mt-4">
              <button
                onClick={doJoin}
                className="comic-border rounded-lg bg-pink-500 px-6 py-2 font-manga text-lg hover:scale-105 transition-transform"
              >
                {t(lang, 'joinGame')}
              </button>
            </div>
            {status && <div className="mt-4 animate-pulse font-manga text-sm text-white/70">{status}</div>}
          </div>
        )}

        {error && (
          <div className="mt-6 animate-shake-sm comic-border rounded-lg bg-red-600 px-4 py-2 font-bold">
            {t(lang, 'connecting')}... {error}
          </div>
        )}
      </div>
    </div>
  );
}