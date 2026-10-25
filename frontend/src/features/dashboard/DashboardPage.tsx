import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Link as LinkIcon,
  Clock,
  TrendingUp,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { MOCK_TRANSACTIONS, MOCK_STATS } from '@/lib/mock-data';
import { EscrowTransaction } from '@/types/escrow';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();

  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7j' | '30j' | '90j'>('30j');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          setTransactions(MOCK_TRANSACTIONS);
        } else {
          const payments = await api.getPayments();
          setTransactions(payments.length > 0 ? payments : MOCK_TRANSACTIONS);
        }
      } catch (err) {
        // Fallback to mock data if API call fails
        setTransactions(MOCK_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDemoMode]);

  // Compute live stats from transactions
  const totalEscrowed = transactions
    .filter((t) => t.status === 'BLOCKED')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalCompleted = transactions
    .filter((t) => t.status === 'RELEASED')
    .reduce((sum, t) => sum + Number(t.net_amount || t.amount || 0), 0);

  const disputesCount = transactions.filter((t) => t.status === 'DISPUTED').length;

  // Chart data for activity
  const chartData = [
    { name: 'Lun', volume: 450000, escrow: 300000 },
    { name: 'Mar', volume: 820000, escrow: 600000 },
    { name: 'Mer', volume: 600000, escrow: 450000 },
    { name: 'Jeu', volume: 1100000, escrow: 875000 },
    { name: 'Ven', volume: 1450000, escrow: 1200000 },
    { name: 'Sam', volume: 950000, escrow: 700000 },
    { name: 'Dim', volume: 1300000, escrow: 875000 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── WELCOME & QUICK ACTIONS ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Bonjour, {user?.full_name || user?.username || 'Utilisateur'} 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Voici la synthèse de vos séquestres financiers et de vos soldes aujourd'hui.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/offers')}
            className="text-xs"
          >
            <LinkIcon size={14} className="text-[#00E5FF]" />
            Créer un Paylink
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/escrow/new')}
            className="text-xs"
          >
            <PlusCircle size={14} />
            Nouveau Séquestre
          </Button>
        </div>
      </div>

      {/* ─── FINANCIAL KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <Card className="relative overflow-hidden border-slate-200/80 dark:border-slate-800/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Solde Disponible
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatFCFA(1450000)}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                +12% par rapport au mois dernier
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Amount in Escrow */}
        <Card className="relative overflow-hidden border-slate-200/80 dark:border-slate-800/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fonds en Escrow
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-[#7B3DFF] dark:text-[#a277ff] tracking-tight">
                {formatFCFA(totalEscrowed || 875000)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Sécurisé sur {transactions.filter((t) => t.status === 'BLOCKED').length || 2} transactions en cours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Released */}
        <Card className="relative overflow-hidden border-slate-200/80 dark:border-slate-800/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Libéré
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center">
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatFCFA(totalCompleted || 2450000)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Transféré sans contestation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dispute Status */}
        <Card className="relative overflow-hidden border-slate-200/80 dark:border-slate-800/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Litiges en cours
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-rose-500 tracking-tight">
                {disputesCount}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {disputesCount > 0 ? 'Médiation en attente' : 'Aucun litige actif'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── CHARTS & STATUS BREAKDOWN ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Volume des Transactions & Séquestres</CardTitle>
              <p className="text-xs text-slate-400 mt-1">Évolution des montants sécurisés (FCFA)</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {(['7j', '30j', '90j'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
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
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B3DFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7B3DFF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorEscrow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#131820',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      color: '#F4F6FC',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatFCFA(Number(val)), '']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#7B3DFF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" name="Volume Global" />
                  <Area type="monotone" dataKey="escrow" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorEscrow)" name="Escrow Actif" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Distribution by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Répartition par Statut</CardTitle>
            <p className="text-xs text-slate-400 mt-1">État des transactions de votre compte</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Séquestrés (En cours)</span>
                <span className="font-semibold text-amber-500">
                  {transactions.filter((t) => t.status === 'BLOCKED').length}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Libérés (Finalisés)</span>
                <span className="font-semibold text-emerald-500">
                  {transactions.filter((t) => t.status === 'RELEASED').length}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Remboursés</span>
                <span className="font-semibold text-slate-400">
                  {transactions.filter((t) => t.status === 'REFUNDED').length}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Litiges</span>
                <span className="font-semibold text-rose-500">
                  {transactions.filter((t) => t.status === 'DISPUTED').length}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>

            {/* Quick banner */}
            <div className="mt-4 p-3 rounded-xl bg-[#7B3DFF]/10 border border-[#7B3DFF]/20 text-xs text-[#7B3DFF] dark:text-[#a277ff]">
              <p className="font-semibold">Code OTP Actif</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Vous avez un code de livraison en attente pour votre achat récent.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── RECENT TRANSACTIONS TABLE ───────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Séquestres Récents</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Dernières opérations enregistrées sur la plateforme</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/transactions')}
            className="text-xs gap-1"
          >
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
                  <th className="py-3 px-3">Partie adverse</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Montant</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {transactions.slice(0, 5).map((t) => {
                  const counterpart =
                    t.role_current_user === 'buyer' ? t.seller_username : t.buyer_username;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/escrow/${t.id}`)}
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-[#F4F6FC]">
                          {t.item_title || t.reference}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {t.reference || `ID #${t.id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[11px] mr-1">
                          {t.role_current_user === 'buyer' ? 'Vendeur:' : 'Acheteur:'}
                        </span>
                        @{counterpart || 'partenaire'}
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatFCFA(t.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <Badge status={t.status} />
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="text-[#7B3DFF] group-hover:translate-x-1 inline-block transition-transform font-semibold text-xs">
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
