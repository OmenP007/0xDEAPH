import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ShieldCheck, ArrowUpRight, PlusCircle,
  Link as LinkIcon, TrendingUp, ShieldAlert, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { EscrowTransaction, WalletSummary } from '@/types/escrow';
import { canCreateEscrow, canCreateOffer } from '@/lib/roles';

/* ─────────────────────────────────────────────────────────────────────────────
 * Motion Design — Dashboard
 * Archetype: Corporate (dashboard) + Premium accent on KPI cards
 *
 * PRIMARY: KPI cards enter staggered (micro-cascade 40ms each, total < 200ms)
 *   each card: opacity 0 → 1, translateY(12px) → 0, duration 300ms
 * SECONDARY: chart fades in after cards settle (stagger 5 = 200ms)
 * AMBIENT: active escrow dot pulses (trust-pulse, 2.8s sine)
 *
 * 1/3 rule: Max 4 cards = 160ms total stagger budget ✓ (< 200ms limit)
 * ───────────────────────────────────────────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [period, setPeriod] = useState<'7j' | '30j' | '90j'>('30j');

  useEffect(() => {
    const fetchData = async () => {
      const [paymentsRes, walletRes] = await Promise.allSettled([
        api.getPayments(),
        api.getWallet(),
      ]);
      setTransactions(paymentsRes.status === 'fulfilled' ? paymentsRes.value : []);
      setWallet(walletRes.status === 'fulfilled' ? walletRes.value : null);
    };
    fetchData();
  }, []);

  const totalEscrowed = transactions
    .filter(t => t.status === 'BLOCKED')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalReleased = transactions
    .filter(t => t.status === 'RELEASED')
    .reduce((s, t) => s + Number(t.net_amount || t.amount || 0), 0);
  const disputesCount = transactions.filter(t => t.status === 'DISPUTED').length;
  const activeCount = transactions.filter(t => t.status === 'BLOCKED').length;

  // Dynamic chart data computed from real account transactions, honoring the
  // selected 7 / 30 / 90-day window.
  const chartData = React.useMemo(() => {
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const periodDays = period === '7j' ? 7 : period === '30j' ? 30 : 90;
    const bucketCount = period === '7j' ? 7 : period === '30j' ? 10 : 12;
    const bucketSize = Math.ceil(periodDays / bucketCount);
    const now = new Date();

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - (periodDays - 1) + i * bucketSize);
      const end = new Date(start);
      end.setDate(start.getDate() + bucketSize - 1);
      end.setHours(23, 59, 59, 999);

      const label =
        period === '7j'
          ? daysOfWeek[start.getDay()]
          : `${String(start.getDate()).padStart(2, '0')}/${String(
              start.getMonth() + 1
            ).padStart(2, '0')}`;

      return { start, end, label, volume: 0, escrow: 0 };
    });

    transactions.forEach((t) => {
      if (!t.created_at) return;
      const date = new Date(t.created_at);
      if (Number.isNaN(date.getTime())) return;
      const bucket = buckets.find((b) => date >= b.start && date <= b.end);
      if (!bucket) return;
      const amount = Number(t.amount || 0);
      bucket.volume += amount;
      if (t.status === 'BLOCKED') bucket.escrow += amount;
    });

    return buckets.map(({ label, volume, escrow }) => ({ name: label, volume, escrow }));
  }, [transactions, period]);

  /* KPI card data for clean stagger map */
  const kpiCards = [
    {
      label: 'Solde Disponible',
      value: formatFCFA(Number(wallet?.available_balance ?? totalReleased)),
      sub: 'Fonds débloqués',
      subColor: 'text-emerald-500',
      icon: Wallet,
      iconBg: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      label: 'Fonds en Escrow',
      value: formatFCFA(totalEscrowed),
      sub: `${activeCount} séquestre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`,
      subColor: 'text-slate-400',
      icon: ShieldCheck,
      iconBg: 'bg-amber-500/10 text-amber-500',
      valueColor: 'text-[#7B3DFF] dark:text-[#a277ff]',
    },
    {
      label: 'Total Libéré',
      value: formatFCFA(totalReleased),
      sub: 'Sans contestation',
      subColor: 'text-slate-400',
      icon: ArrowUpRight,
      iconBg: 'bg-[#00E5FF]/10 text-[#00E5FF]',
    },
    {
      label: 'Litiges en cours',
      value: String(disputesCount),
      sub: disputesCount > 0 ? 'Médiation en attente' : 'Aucun litige actif',
      subColor: disputesCount > 0 ? 'text-rose-500' : 'text-slate-400',
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10 text-rose-500',
      valueColor: disputesCount > 0 ? 'text-rose-500' : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-enter"
        style={{ animationFillMode: 'forwards' }}
      >
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Bonjour, {user?.full_name || user?.username || 'Utilisateur'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Voici la synthèse de vos séquestres et soldes du jour.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canCreateOffer(user) && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/offers')} className="text-xs">
              <LinkIcon size={14} className="text-[#00E5FF]" />
              Créer un Paylink
            </Button>
          )}
          {canCreateEscrow(user) && (
            <Button variant="primary" size="sm" onClick={() => navigate('/escrow/new')} className="text-xs">
              <PlusCircle size={14} />
              Nouveau Séquestre
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards — staggered micro-cascade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card
            key={kpi.label}
            className={`card-hover opacity-0 animate-enter stagger-${i + 1}`}
            style={{ animationFillMode: 'forwards' }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-black tracking-tight ${kpi.valueColor || 'text-slate-900 dark:text-white'}`}>
                  {kpi.value}
                </p>
                <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${kpi.subColor}`}>
                  {i === 0 && <TrendingUp size={12} />}
                  {kpi.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts — secondary layer, enters after KPI settle */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-0 animate-enter stagger-5`}
        style={{ animationFillMode: 'forwards' }}
      >
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Volume des Transactions</CardTitle>
              <p className="text-xs text-slate-400 mt-1">Évolution sur les {period.replace('j', ' derniers jours')} (FCFA)</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {(['7j', '30j', '90j'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-150 ${
                    period === p
                      ? 'bg-white dark:bg-[#131820] text-[#7B3DFF] shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B3DFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7B3DFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEsc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(Number(v) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k` : `${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131820', border: '1px solid #1e293b', borderRadius: '12px', color: '#F4F6FC', fontSize: '12px' }}
                    formatter={(v: any) => [formatFCFA(Number(v)), '']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#7B3DFF" strokeWidth={2.5} fill="url(#gradVol)" name="Volume" />
                  <Area type="monotone" dataKey="escrow" stroke="#00E5FF" strokeWidth={2} fill="url(#gradEsc)" name="Escrow" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Répartition Statuts</CardTitle>
            <p className="text-xs text-slate-400 mt-1">État des transactions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Séquestrés', key: 'BLOCKED' as const, color: 'bg-amber-400', textColor: 'text-amber-500' },
              { label: 'Libérés',    key: 'RELEASED' as const, color: 'bg-emerald-400', textColor: 'text-emerald-500' },
              { label: 'Remboursés', key: 'REFUNDED' as const, color: 'bg-slate-400',   textColor: 'text-slate-400' },
              { label: 'Litiges',   key: 'DISPUTED' as const, color: 'bg-rose-500',    textColor: 'text-rose-500' },
            ].map(row => {
              const count = transactions.filter(t => t.status === row.key).length;
              const pct = transactions.length > 0 ? `${Math.round((count / transactions.length) * 100)}%` : '0%';
              return (
                <div key={row.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{row.label}</span>
                    <span className={`font-semibold ${row.textColor}`}>
                      {count} ({pct})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}
                      style={{ width: pct }}
                    />
                  </div>
                </div>
              );
            })}

            {/* AMBIENT: OTP active indicator only when active escrows exist */}
            {activeCount > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-[#7B3DFF]/10 border border-[#7B3DFF]/20 text-xs text-[#7B3DFF] dark:text-[#a277ff]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#7B3DFF] animate-trust-pulse" />
                  <p className="font-semibold">Code OTP Actif</p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeCount} séquestre{activeCount > 1 ? 's' : ''} en attente de validation OTP de livraison.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions table */}
      <Card className="opacity-0 animate-enter" style={{ animationDelay: '280ms', animationFillMode: 'forwards' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Séquestres Récents</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Dernières opérations enregistrées</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/transactions')} className="text-xs gap-1">
            <span>Voir tout</span>
            <ChevronRight size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Référence / Objet</th>
                  <th className="py-3 px-3">Contrepartie</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Montant</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {transactions.slice(0, 5).map((t, i) => {
                  const counterpart = t.role_current_user === 'buyer' ? t.seller_username : t.buyer_username;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/escrow/${t.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150 cursor-pointer group opacity-0 animate-enter"
                      style={{ animationDelay: `${300 + i * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-[#F4F6FC] truncate max-w-[160px]">
                          {t.item_title || t.reference}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{t.reference || `#${t.id}`}</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                        @{counterpart || 'partenaire'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">{formatDate(t.created_at)}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatFCFA(t.amount)}</td>
                      <td className="py-3.5 px-3"><Badge status={t.status} /></td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="text-[#7B3DFF] group-hover:translate-x-1 inline-block transition-transform duration-150 font-semibold">
                          Détails →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
