import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, type CharacterDef } from '../engine/characters';
import type { CharacterId } from '../engine/types';
import { t, type Lang } from '../i18n';
import type { NetPeer, NetMessage } from '../net/peer';

interface Props {
  lang: Lang;
  mode: 'practice' | 'ai' | 'online';
  peer?: NetPeer | null;
  onConfirm: (playerChar: CharacterId, opponentChar: CharacterId | null) => void;
  onBack: () => void;
}

function randomOtherChar(exclude: CharacterId): CharacterId {
  const pool = CHARACTERS.filter((c) => c.id !== exclude);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export default function CharacterSelect({ lang, mode, peer, onConfirm, onBack }: Props) {
  const [hoverChar, setHoverChar] = useState<CharacterDef>(CHARACTERS[0]);
  const [selected, setSelected] = useState<CharacterId | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [oppChar, setOppChar] = useState<CharacterId | null>(null);
  const [oppConfirmed, setOppConfirmed] = useState(false);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (mode !== 'online' || !peer) return;
    peer.onData = (msg: NetMessage) => {
      if (msg.type === 'select') {
        setOppChar(msg.characterId as CharacterId);
      } else if (msg.type === 'ready') {
        setOppConfirmed(true);
      }
    };
    return () => {
      if (peer) peer.onData = null;
    };
  }, [mode, peer]);

  useEffect(() => {
    if (confirmed && oppConfirmed && !confirmedRef.current) {
      confirmedRef.current = true;
      const myChar = selected ?? hoverChar.id;
      setTimeout(() => onConfirm(myChar, oppChar), 650);
    }
  }, [confirmed, oppConfirmed, selected, hoverChar, oppChar, onConfirm]);

  // AI / practice: no need to wait for "opponent" readiness
  useEffect(() => {
    if (confirmed && mode !== 'online' && !confirmedRef.current) {
      confirmedRef.current = true;
      const myChar = selected ?? hoverChar.id;
      const finalOpp = mode === 'ai' ? randomOtherChar(myChar) : null;
      if (mode === 'ai') setOppChar(finalOpp);
      setTimeout(() => onConfirm(myChar, finalOpp), 650);
    }
  }, [confirmed, mode, selected, hoverChar, onConfirm]);

  const displayChar = CHARACTERS.find((c) => c.id === (selected ?? hoverChar.id))!;
  const oppDisplay = oppChar ? CHARACTERS.find((c) => c.id === oppChar)! : null;

  const handlePick = (id: CharacterId) => {
    setSelected(id);
    setHoverChar(CHARACTERS.find((c) => c.id === id)!);
    if (mode === 'online' && peer) {
      peer.send({ type: 'select', characterId: id });
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmed(true);
    if (mode === 'online' && peer) {
      peer.send({ type: 'ready' });
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#140d24] halftone-bg px-3 py-4 text-white">
      <button
        onClick={onBack}
        className="comic-border rounded-lg bg-red-500 px-4 py-2 font-manga text-sm hover:scale-105 transition-transform"
      >
        ← {t(lang, 'back')}
      </button>

      <div className="mx-auto mt-4 max-w-5xl">
        <div className="relative flex items-stretch justify-center gap-2">
          {/* 1P frame */}
          <div className="comic-border-thick relative flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-blue-700 to-blue-950 p-3">
            <div className="absolute left-2 top-2 font-manga text-lg text-blue-200">{t(lang, 'playerVs')}</div>
            <div className="flex h-64 items-end justify-center sm:h-80">
              <img src={displayChar.image} alt={displayChar.name} className="h-full object-contain drop-shadow-2xl animate-pop-in" key={displayChar.id} />
            </div>
            <div className="mt-2 text-center">
              <div className="font-manga text-xl text-yellow-300">{displayChar.name}</div>
              <div className="font-manga text-xs text-cyan-300">{displayChar.abilityName[lang]}</div>
              {confirmed && <div className="mt-1 animate-pulse font-manga text-sm text-green-400">{t(lang, 'ready')}</div>}
            </div>
          </div>

          <div className="z-10 flex items-center">
            <div className="font-manga comic-border-thick flex h-16 w-16 rotate-6 items-center justify-center rounded-full bg-yellow-400 text-xl text-red-600 sm:h-20 sm:w-20 sm:text-2xl">
              {t(lang, 'vsBadge')}
            </div>
          </div>

          {/* 2P/AI frame */}
          <div className="comic-border-thick relative flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-red-700 to-red-950 p-3">
            <div className="absolute right-2 top-2 font-manga text-lg text-red-200">{t(lang, 'opponentVs')}</div>
            {oppDisplay ? (
              <>
                <div className="flex h-64 items-end justify-center sm:h-80">
                  <img src={oppDisplay.image} alt={oppDisplay.name} className="h-full object-contain drop-shadow-2xl animate-pop-in" key={oppDisplay.id} />
                </div>
                <div className="mt-2 text-center">
                  <div className="font-manga text-xl text-yellow-300">{oppDisplay.name}</div>
                  <div className="font-manga text-xs text-orange-300">{oppDisplay.abilityName[lang]}</div>
                  {oppConfirmed && <div className="mt-1 animate-pulse font-manga text-sm text-green-400">{t(lang, 'ready')}</div>}
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-center font-manga text-lg text-white/50 sm:h-80">
                {mode === 'practice' ? '— SOLO —' : t(lang, 'selecting')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 comic-border rounded-xl bg-black/50 p-3 text-center">
          <div className="font-manga text-xs text-purple-300">{t(lang, 'special')}</div>
          <div className="text-sm font-bold text-white/90">{displayChar.abilityDesc[lang]}</div>
        </div>

        <div className="mt-5 text-center font-manga text-lg text-yellow-300">{t(lang, 'chooseCharacter')}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onMouseEnter={() => !selected && setHoverChar(c)}
              onClick={() => handlePick(c.id)}
              className={`comic-border rounded-xl bg-gradient-to-b p-2 transition-all hover:scale-110 ${
                selected === c.id ? 'scale-110 ring-4 ring-yellow-300' : ''
              }`}
              style={{ background: `linear-gradient(160deg, ${c.color}, #1a1530)` }}
            >
              <img src={c.image} alt={c.name} className="h-24 w-20 object-contain sm:h-28 sm:w-24" />
              <div className="mt-1 text-center font-manga text-[11px]">{c.name}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-center pb-8">
          <button
            disabled={!selected || confirmed}
            onClick={handleConfirm}
            className={`comic-border-thick rounded-xl px-10 py-4 font-manga text-xl transition-transform ${
              !selected ? 'cursor-not-allowed bg-gray-600 text-gray-400' : confirmed ? 'bg-green-500 text-white animate-pulse' : 'bg-yellow-400 text-black hover:scale-105'
            }`}
          >
            {confirmed ? (mode === 'online' ? t(lang, 'waitingOpponent') : t(lang, 'ready')) : t(lang, 'confirmSelection')}
          </button>
        </div>
      </div>
    </div>
  );
}
