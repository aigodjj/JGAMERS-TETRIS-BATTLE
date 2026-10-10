import ComicPanel from './ComicPanel';
import { t, LANG_LABELS, type Lang } from '../i18n';
import { CHARACTERS } from '../engine/characters';

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  onNavigate: (screen: 'solo' | 'online' | 'options') => void;
}

export default function MainMenu({ lang, setLang, onNavigate }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1530]">
      {/* backdrop */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, #3b2a66 0%, #1a1530 70%)' }} />
      <div className="absolute inset-0 halftone-bg opacity-60" />
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{
        backgroundImage: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.04) 0deg 6deg, transparent 6deg 12deg)',
      }} />

      {/* floating character art */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {CHARACTERS.map((c, i) => (
          <img
            key={c.id}
            src={c.image}
            alt=""
            className="absolute opacity-20 drop-shadow-2xl"
            style={{
              height: '340px',
              left: `${6 + i * 20}%`,
              bottom: '-20px',
              filter: 'grayscale(0.1)',
              transform: `rotate(${i % 2 === 0 ? -4 : 4}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-8">
        {/* header */}
        <div className="flex w-full max-w-6xl items-start justify-between">
          <div className="animate-pop-in -rotate-3 rounded-xl border-4 border-black bg-gradient-to-br from-red-600 to-yellow-400 px-4 py-2 shadow-[6px_6px_0_#000]">
            <div className="font-manga text-2xl sm:text-4xl text-white drop-shadow-[2px_2px_0_#000] sm:tracking-wide">
              {t(lang, 'gameTitle')}
            </div>
            <div className="font-manga text-xs sm:text-sm text-yellow-100">{t(lang, 'bannerTag')}</div>
          </div>

          <div className="flex rotate-2 gap-1 rounded-xl border-4 border-black bg-purple-700 p-1 shadow-[4px_4px_0_#000]">
            {(['tc', 'en', 'sc'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-black transition-all ${
                  lang === l ? 'bg-yellow-300 text-black scale-105' : 'bg-purple-900/60 text-white/80 hover:bg-purple-800'
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* panels */}
        <div className="mt-16 flex flex-1 flex-wrap items-center justify-center gap-10 sm:mt-24">
          <div className="animate-pop-in" style={{ animationDelay: '0.05s' }}>
            <ComicPanel
              title={t(lang, 'menuSolo')}
              desc={t(lang, 'menuSoloDesc')}
              gradient="linear-gradient(135deg,#ffb703,#fb5607)"
              rotate={-3}
              icon={'🎮'}
              onClick={() => onNavigate('solo')}
              big
            />
          </div>
          <div className="animate-pop-in" style={{ animationDelay: '0.15s' }}>
            <ComicPanel
              title={t(lang, 'menuOnline')}
              desc={t(lang, 'menuOnlineDesc')}
              gradient="linear-gradient(135deg,#3a86ff,#d100d1)"
              rotate={2}
              icon={'🌐'}
              onClick={() => onNavigate('online')}
              big
            />
          </div>
          <div className="animate-pop-in" style={{ animationDelay: '0.25s' }}>
            <ComicPanel
              title={t(lang, 'menuOptions')}
              desc={t(lang, 'menuOptionsDesc')}
              gradient="linear-gradient(135deg,#8338ec,#5e17eb)"
              rotate={-2}
              icon={'⚙️'}
              onClick={() => onNavigate('options')}
              big
            />
          </div>
        </div>

                
       
        
      </div>
    </div>
  );
}
