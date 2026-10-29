import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShieldCheck,
  Scale,
  Wallet,
  Info,
  CheckCheck,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import { formatDate } from '@/lib/utils';

const iconFor = (type: string) => {
  switch (type) {
    case 'escrow':
      return ShieldCheck;
    case 'dispute':
      return Scale;
    case 'wallet':
      return Wallet;
    default:
      return Info;
  }
};

const colorFor = (type: string) => {
  switch (type) {
    case 'escrow':
      return 'bg-[#7B3DFF]/10 text-[#7B3DFF]';
    case 'dispute':
      return 'bg-rose-500/10 text-rose-500';
    case 'wallet':
      return 'bg-emerald-500/10 text-emerald-500';
    default:
      return 'bg-slate-500/10 text-slate-500';
  }
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, refresh, markAllRead } =
    useAppNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'escrow' | 'dispute' | 'wallet'>(
    'all'
  );

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6 animate-page-enter max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
              Centre de Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#7B3DFF] text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Suivez les mouvements de vos séquestres, litiges et opérations de portefeuille.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} isLoading={loading} className="text-xs gap-1.5">
            <RefreshCw size={14} />
            Actualiser
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="text-xs gap-1.5"
          >
            <CheckCheck size={14} />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'unread', label: `Non lues (${unreadCount})` },
          { id: 'escrow', label: 'Séquestres' },
          { id: 'dispute', label: 'Litiges' },
          { id: 'wallet', label: 'Portefeuille' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#7B3DFF] text-white'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <Card className="p-12 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-[#7B3DFF] border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 space-y-2">
          <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold">Aucune notification dans cette catégorie.</p>
          <p className="text-xs">
            Les alertes apparaîtront dès qu'une transaction, un litige ou un mouvement de
            portefeuille sera enregistré.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <Card
                key={n.id}
                className={`p-4 flex items-start gap-3 transition-all ${
                  n.read ? 'opacity-70' : 'border-[#7B3DFF]/30'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorFor(n.type)}`}>
                  <Icon size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F4F6FC]">
                      {n.title}
                    </p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#7B3DFF]" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.date)}</p>
                </div>
                {n.link && (
                  <button
                    onClick={() => navigate(n.link!)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B3DFF] hover:underline shrink-0"
                  >
                    Voir <ChevronRight size={13} />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
