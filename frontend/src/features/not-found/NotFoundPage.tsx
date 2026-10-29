import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* AMBIENT layer — background glow floats */}
      <div
        className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-[120px] pointer-events-none animate-glow-float"
        style={{ background: 'rgba(123,61,255,0.12)', animationDelay: '0s' }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full blur-[100px] pointer-events-none animate-glow-float"
        style={{ background: 'rgba(0,229,255,0.08)', animationDelay: '3s' }}
      />

      {/* SECONDARY — Brand logo fade in */}
      <div className="mb-2 opacity-0 animate-enter stagger-1" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TRUST" className="w-8 h-8 object-contain" />
          <span className="text-base font-black text-white tracking-tight">TRUST</span>
        </div>
      </div>

      {/* PRIMARY — 404 label */}
      <p
        className="text-xs font-bold tracking-[0.3em] uppercase text-[#7B3DFF] mb-2 opacity-0 animate-enter stagger-2"
        style={{ animationFillMode: 'forwards' }}
      >
        Erreur 404
      </p>

      {/* PRIMARY — Animated face (Playful archetype — illustration exception) */}
      {/* 
        Motion: face__eyes enters from translateY(112.5px) → translateY(15px) in 1s
        face__eye-lid blinks every 4s (ambient continuous)  
        face__pupil follows gaze pattern (ambient continuous)
        mouth draws in from stroke-dashoffset 
        nose moves upward on entry
        Stroke color = TRUST purple #7B3DFF (brand adaptation)
      */}
      <div
        className="opacity-0 animate-enter stagger-3"
        style={{
          animationFillMode: 'forwards',
          animationDuration: '600ms',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '280px',
        }}
      >
        <svg
          className="w-40 sm:w-48"
          viewBox="0 0 320 380"
          style={{ color: '#7B3DFF' }}
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="22"
          >
            {/* Eyes group — enters from below (face-eyes: 1s 0.3s) */}
            <g
              style={{
                transform: 'translateY(112.5px)',
                animation: 'face-eyes 1s 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {/* Left eye */}
              <g transform="translate(15,0)">
                <polyline
                  points="37,0 0,120 75,120"
                  style={{
                    animation: 'face-eye-lid 4s 1.3s ease-in-out infinite',
                  }}
                />
                <polyline
                  points="55,120 55,155"
                  strokeDasharray="35 35"
                  style={{
                    animation: 'face-pupil 4s 1.3s ease-in-out infinite',
                  }}
                />
              </g>
              {/* Right eye */}
              <g transform="translate(230,0)">
                <polyline
                  points="37,0 0,120 75,120"
                  style={{
                    animation: 'face-eye-lid 4s 1.3s ease-in-out infinite',
                  }}
                />
                <polyline
                  points="55,120 55,155"
                  strokeDasharray="35 35"
                  style={{
                    animation: 'face-pupil 4s 1.3s ease-in-out infinite',
                  }}
                />
              </g>
            </g>

            {/* Nose — enters upward */}
            <rect
              x="132.5"
              y="112.5"
              width="55"
              height="155"
              rx="4"
              ry="4"
              style={{
                animation: 'face-nose 1s 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            />

            {/* Mouth — draws in from sides via stroke-dashoffset */}
            <g
              transform="translate(65,334)"
              strokeDasharray="102 102"
              stroke="#00E5FF" /* Cyan accent — Visual Narrative: sad turned surprise */
            >
              <path
                d="M 0 30 C 0 30 40 0 95 0"
                style={{
                  strokeDashoffset: -102,
                  animation: 'face-mouth-left 1s 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              />
              <path
                d="M 95 0 C 150 0 190 30 190 30"
                style={{
                  strokeDashoffset: 102,
                  animation: 'face-mouth-right 1s 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
                }}
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Content block — staggers in after face */}
      <div
        className="text-center max-w-sm mt-2 opacity-0 animate-enter stagger-4"
        style={{ animationFillMode: 'forwards' }}
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Transaction introuvable
        </h1>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Cette page n'existe pas ou a été déplacée. Vos fonds séquestrés restent{' '}
          <span className="text-[#00E5FF] font-semibold">entièrement sécurisés</span>.
        </p>
      </div>

      {/* CTAs — stagger 5 */}
      <div
        className="mt-8 flex items-center gap-3 opacity-0 animate-enter stagger-5"
        style={{ animationFillMode: 'forwards' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
        >
          <ArrowLeft size={14} />
          Retour
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-xs"
        >
          <Home size={14} />
          Accueil TRUST
        </Button>
      </div>
    </div>
  );
};
