import * as React from 'react';
import { cn } from '@/lib/utils';
import { EscrowStatus } from '@/types/escrow';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan';
  status?: EscrowStatus;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant, status, children, ...props }) => {
  // If status is provided, map it to specific FinTech color tokens
  let statusStyle = '';
  let statusLabel = children;

  if (status) {
    switch (status) {
      case 'CREATED':
        statusStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        statusLabel = statusLabel || 'Créé';
        break;
      case 'BLOCKED':
        statusStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        statusLabel = statusLabel || 'Fonds Séquestrés';
        break;
      case 'RELEASED':
        statusStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        statusLabel = statusLabel || 'Fonds Libérés';
        break;
      case 'REFUNDED':
        statusStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        statusLabel = statusLabel || 'Remboursé';
        break;
      case 'DISPUTED':
        statusStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        statusLabel = statusLabel || 'En Litige';
        break;
    }
  }

  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20',
    purple: 'bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] border-[#7B3DFF]/20',
    cyan: 'bg-[#00E5FF]/10 text-[#00cce6] dark:text-[#00E5FF] border-[#00E5FF]/20',
  };

  const selectedVariant = variant ? variants[variant] : statusStyle || variants.default;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        selectedVariant,
        className
      )}
      {...props}
    >
      {status === 'BLOCKED' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {status === 'RELEASED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {status === 'DISPUTED' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
      {statusLabel}
    </span>
  );
};
