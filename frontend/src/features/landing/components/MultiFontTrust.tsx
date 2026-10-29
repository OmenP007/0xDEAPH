import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Shuffle } from 'lucide-react';

interface FontArchetype {
  id: string;
  name: string;
  className: string;
  genre: string;
  weight: string;
}

const FONT_ARCHETYPES: FontArchetype[] = [
  {
    id: 'cinzel',
    name: 'Cinzel',
    className: 'font-cinzel tracking-normal',
    genre: 'Souverain & Chisel Roman',
    weight: 'font-black',
  },
  {
    id: 'syne',
    name: 'Syne',
    className: 'font-syne tracking-tight',
    genre: 'Avant-Garde Display',
    weight: 'font-extrabold',
  },
  {
    id: 'space',
    name: 'Space Mono',
    className: 'font-space tracking-tight',
    genre: 'Crypto Ledger Monospace',
    weight: 'font-bold',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    className: 'font-playfair italic tracking-tight',
    genre: 'Haute Horlogerie & Luxe',
    weight: 'font-black',
  },
  {
    id: 'unbounded',
    name: 'Unbounded',
    className: 'font-unbounded tracking-tighter',
    genre: 'Cyber Neo-Grotesque',
    weight: 'font-black',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta',
    className: 'font-jakarta tracking-tight',
    genre: 'Modern FinTech Sans',
    weight: 'font-black',
  },
];

const WORD = ['T', 'R', 'U', 'S', 'T'];

export const MultiFontTrust: React.FC = () => {
  // Each letter has its own font index in FONT_ARCHETYPES
  const [fontIndices, setFontIndices] = useState<number[]>([0, 1, 2, 3, 4]);
  const [animatingIndices, setAnimatingIndices] = useState<boolean[]>([false, false, false, false, false]);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  // Auto-cycle fonts with a smooth staggered cadence
  useEffect(() => {
    // Respect user's motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (isHovered) return; // Pause on hover to allow inspection

      // Stagger font rotation across letters
      WORD.forEach((_, letterIdx) => {
        setTimeout(() => {
          setAnimatingIndices(prev => {
            const next = [...prev];
            next[letterIdx] = true;
            return next;
          });

          setFontIndices(prev => {
            const next = [...prev];
            next[letterIdx] = (next[letterIdx] + 1) % FONT_ARCHETYPES.length;
            return next;
          });

          // Reset animation trigger
          setTimeout(() => {
            setAnimatingIndices(prev => {
              const next = [...prev];
              next[letterIdx] = false;
              return next;
            });
          }, 450);
        }, letterIdx * 90);
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [isHovered]);

  // Interactive letter scramble / slot-machine roll on single letter hover
  const scrambleLetter = (letterIdx: number) => {
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);

    let rolls = 0;
    const maxRolls = 5;
    setAnimatingIndices(prev => {
      const next = [...prev];
      next[letterIdx] = true;
      return next;
    });

    const rollStep = () => {
      rolls++;
      setFontIndices(prev => {
        const next = [...prev];
        next[letterIdx] = (next[letterIdx] + Math.floor(Math.random() * (FONT_ARCHETYPES.length - 1)) + 1) % FONT_ARCHETYPES.length;
        return next;
      });

      if (rolls < maxRolls) {
        setTimeout(rollStep, 60);
      } else {
        setTimeout(() => {
          setAnimatingIndices(prev => {
            const next = [...prev];
            next[letterIdx] = false;
            return next;
          });
        }, 200);
      }
    };

    rollStep();
  };

  // Manual trigger to reshuffle all letters at once
  const reshuffleAll = () => {
    WORD.forEach((_, letterIdx) => {
      setTimeout(() => {
        scrambleLetter(letterIdx);
      }, letterIdx * 50);
    });
  };

  return (
    <div
      className="relative inline-flex flex-col items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveTooltip(null);
      }}
    >
      {/* ─── MULTI-FONT KINETIC H1 DISPLAY ─── */}
      <div className="relative inline-flex items-center justify-center gap-0.5 sm:gap-1.5 py-1">
        {WORD.map((char, index) => {
          const font = FONT_ARCHETYPES[fontIndices[index]];
          const isAnimating = animatingIndices[index];

          return (
            <div
              key={index}
              className="relative group cursor-pointer"
              onMouseEnter={() => setActiveTooltip(`${font.name} • ${font.genre}`)}
              onClick={() => scrambleLetter(index)}
              title={`${char} — Police: ${font.name} (${font.genre})`}
            >
              {/* Outer letter box with fixed proportional width to completely eliminate CLS (layout shift) */}
              <span
                className={`
                  inline-flex items-center justify-center 
                  w-[1.05ch] sm:w-[1.08ch] text-center
                  text-5xl sm:text-7xl lg:text-8xl xl:text-9xl
                  bg-gradient-to-r from-[#7B3DFF] via-[#00E5FF] to-[#9e6bfa] 
                  bg-clip-text text-transparent 
                  animate-text-shimmer
                  transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                  transform-gpu
                  group-hover:scale-105 group-hover:brightness-125
                  ${font.className}
                  ${font.weight}
                  ${isAnimating ? 'scale-90 opacity-75 blur-[0.8px] -translate-y-1' : 'scale-100 opacity-100 blur-0 translate-y-0'}
                `}
                style={{
                  willChange: 'transform, filter, opacity',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                }}
              >
                {char}
              </span>

              {/* Subtle underline dot indicator with letter-specific accent */}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#7B3DFF]/40 group-hover:bg-[#00E5FF] group-hover:scale-125 transition-all duration-200" />
            </div>
          );
        })}
      </div>

      {/* ─── SUB-BADGE: TYPOGRAPHY PILL & ACTIVE FONT LABELS ─── */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={reshuffleAll}
          className="group inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium tracking-wide bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-[#7B3DFF] dark:hover:text-[#00E5FF] hover:border-[#7B3DFF]/40 transition-all shadow-sm hover:shadow"
        >
          <Shuffle size={12} className="text-[#7B3DFF] group-hover:rotate-180 transition-transform duration-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activeTooltip ? activeTooltip : 'Typographie Multi-Polices en Harmonie'}
          </span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] font-mono">
            {FONT_ARCHETYPES.length} polices
          </span>
        </button>
      </div>
    </div>
  );
};
