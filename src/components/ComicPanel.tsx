import type { ReactNode } from 'react';

interface Props {
  title: string;
  desc: string;
  gradient: string;
  rotate: number;
  icon: ReactNode;
  onClick: () => void;
  big?: boolean;
}

export default function ComicPanel({ title, desc, gradient, rotate, icon, onClick, big }: Props) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left outline-none"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className={`comic-border-thick halftone-bg-light relative overflow-hidden rounded-2xl px-6 py-5 transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-hover:rotate-0 group-active:scale-95 ${big ? 'w-72 sm:w-80' : 'w-64 sm:w-72'}`}
        style={{ background: gradient }}
      >
        <div className="relative z-10 flex items-center gap-3">
          <div className="text-4xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]">{icon}</div>
          <div>
            <div className="font-manga text-xl sm:text-2xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]">
              {title}
            </div>
            <div className="mt-1 text-xs sm:text-sm font-bold text-white/90 drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)]">
              {desc}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rotate-12 rounded-full bg-white/25 blur-sm" />
      </div>
    </button>
  );
}
