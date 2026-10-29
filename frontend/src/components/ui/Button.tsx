import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Motion: Premium/Corporate archetype (FinTech)
 * Press: scale 0.98, opacity 0.95 → 150ms, ease-snappy (0.2,0,0,1)  → 0% overshoot
 * Hover: shadow lift + background shift → < 100ms
 * Focus ring: scale 0.95→1 opacity 0→1, 150ms
 * No bouncy overshoot on financial buttons (Corporate rule: 0–3% max)
 * ───────────────────────────────────────────────────────────────────────────── */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium ' +
      'transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'disabled:opacity-50 disabled:pointer-events-none select-none rounded-xl ' +
      'active:scale-[0.97] active:opacity-90';

    const variants: Record<string, string> = {
      primary:
        'bg-[#7B3DFF] text-white ' +
        'hover:bg-[#682ae8] hover:shadow-[0_6px_20px_rgba(123,61,255,0.3)] ' +
        'shadow-[0_3px_12px_rgba(123,61,255,0.2)] focus-visible:ring-[#7B3DFF]',
      secondary:
        'bg-slate-100 dark:bg-[#1E2533] text-slate-900 dark:text-[#F4F6FC] ' +
        'hover:bg-slate-200 dark:hover:bg-[#252E40] ' +
        'border border-slate-200 dark:border-slate-800',
      outline:
        'border border-slate-200 dark:border-slate-800 ' +
        'text-slate-700 dark:text-slate-300 ' +
        'hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white ' +
        'hover:border-slate-300 dark:hover:border-slate-700',
      ghost:
        'text-slate-600 dark:text-slate-400 ' +
        'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50',
      danger:
        'bg-rose-500/10 text-rose-500 border border-rose-500/20 ' +
        'hover:bg-rose-500 hover:text-white hover:border-rose-500 ' +
        'hover:shadow-[0_4px_14px_rgba(244,63,94,0.25)] focus-visible:ring-rose-500',
      accent:
        'bg-[#00E5FF] text-[#0B0F14] font-semibold ' +
        'hover:bg-[#00cce6] hover:shadow-[0_6px_20px_rgba(0,229,255,0.3)] ' +
        'shadow-[0_3px_12px_rgba(0,229,255,0.2)] focus-visible:ring-[#00E5FF]',
    };

    const sizes: Record<string, string> = {
      sm:   'text-xs px-3 py-1.5 h-8 gap-1.5',
      md:   'text-sm px-4 py-2.5 h-10 gap-2',
      lg:   'text-base px-6 py-3.5 h-12 gap-2.5 font-semibold',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Chargement...
          </span>
        ) : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
