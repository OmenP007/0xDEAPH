import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export function calculateFees(amount: number) {
  const fee = Math.round(amount * 0.01);
  const net = amount - fee;
  return { fee, net };
}

export function formatDate(isoDateString?: string): string {
  if (!isoDateString) return '-';
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoDateString;
  }
}

export function getRemainingTime(autoReleaseIso?: string): {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  if (!autoReleaseIso) {
    return { isExpired: false, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '-' };
  }

  const now = new Date().getTime();
  const target = new Date(autoReleaseIso).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { isExpired: true, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: 'Expiré (Déblocage auto)' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const formatted = `${days > 0 ? `${days}j ` : ''}${hours}h ${minutes}m ${seconds}s`;
  return { isExpired: false, days, hours, minutes, seconds, formatted };
}
