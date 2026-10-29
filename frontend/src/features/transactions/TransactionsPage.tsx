import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wallet,
  Smartphone,
  Building2,
  CreditCard,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { FinancialLedgerEntry, FinancialTransactionType } from '@/types/escrow';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<FinancialLedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const [paymentsRes, walletRes] = await Promise.allSettled([
        api.getPayments(),
        api.getWallet(),
      ]);
      const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value : [];
      const wallet = walletRes.status === 'fulfilled' ? walletRes.value : null;

      const escrowEntries: FinancialLedgerEntry[] = payments.map((p) => {
        const isBuyer = p.role_current_user === 'buyer' || p.buyer_username === user?.username;
        return {
          id: `TX-${p.id}`,
          reference: p.reference || `FLUX-TR-${p.id}`,
          type:
            p.status === 'REFUNDED'
              ? 'ESCROW_REFUND'
              : isBuyer
              ? 'ESCROW_DEPOSIT'
              : 'ESCROW_PAYOUT',
          description: `${p.item_title || 'Séquestre'} (${p.reference || `#${p.id}`})`,
          amount: Number(p.amount),
          direction: isBuyer || p.status === 'REFUNDED' ? 'OUT' : 'IN',
          fee: Number(p.fee_amount || Math.round(Number(p.amount) * 0.01)),
          payment_method: 'ESCROW_BALANCE',
          status:
            p.status === 'RELEASED' || p.status === 'REFUNDED'
              ? 'COMPLETED'
              : p.status === 'DISPUTED'
              ? 'PENDING'
              : 'PENDING',
          related_escrow_id: p.id,
          date: p.created_at,
        };
      });

      const walletEntries: FinancialLedgerEntry[] = (wallet?.transactions || []).map((t) => ({
        id: `WALLET-${t.id}`,
        reference: t.reference,
        type: t.type === 'TOPUP' ? 'WALLET_TOPUP' : 'WALLET_WITHDRAWAL',
        description:
          t.type === 'TOPUP'
            ? `Rechargement ${t.method_label || t.method}${t.phone ? ` (${t.phone.startsWith('+') ? t.phone : `+221 ${t.phone}`})` : ''}`
            : `Retrait ${t.method_label || t.method}${t.phone ? ` (${t.phone.startsWith('+') ? t.phone : `+221 ${t.phone}`})` : ''}`,
        amount: Number(t.amount),
        direction: t.type === 'TOPUP' ? 'IN' : 'OUT',
        fee: Number(t.fee || 0),
        payment_method: t.method,
        status:
          t.status === 'COMPLETED'
            ? 'COMPLETED'
            : t.status === 'FAILED'
            ? 'FAILED'
            : 'PENDING',
        date: t.completed_at || t.created_at,
      }));

      setTransactions(
        [...walletEntries, ...escrowEntries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  // Financial aggregates
  const totalIn = transactions
    .filter((t) => t.direction === 'IN')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.direction === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = transactions.reduce((sum, t) => sum + (t.fee || 0), 0);

  // Filtered transactions
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase());

    const matchesDirection = directionFilter === 'ALL' || t.direction === directionFilter;
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesMethod =
      paymentMethodFilter === 'ALL' || t.payment_method === paymentMethodFilter;

    return matchesSearch && matchesDirection && matchesType && matchesMethod;
  });

  const exportCSV = () => {
    const headers = 'Reference,Date,Type,Description,Direction,Montant,Frais,Methode,Statut\n';
    const rows = filtered
      .map(
        (t) =>
          `"${t.reference}","${t.date}","${t.type}","${t.description}","${t.direction}",${t.amount},${t.fee},"${t.payment_method}","${t.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TRUST_Releve_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'WAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
            <Smartphone size={11} /> Wave
          </span>
        );
      case 'ORANGE_MONEY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Smartphone size={11} /> Orange Money
          </span>
        );
      case 'MTN_MOMO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <Smartphone size={11} /> MTN MoMo
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building2 size={11} /> Virement BOA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] border border-[#7B3DFF]/20">
            <Wallet size={11} /> Séquestre TRUST
          </span>
        );
    }
  };

  const getTypeLabel = (type: FinancialTransactionType) => {
    switch (type) {
      case 'ESCROW_PAYOUT':
        return 'Paiement Séquestre Débloqué';
      case 'ESCROW_DEPOSIT':
        return 'Consignation Séquestre';
      case 'ESCROW_REFUND':
        return 'Remboursement Séquestre';
      case 'WALLET_TOPUP':
        return 'Rechargement de Solde';
      case 'WALLET_WITHDRAWAL':
        return 'Retrait vers Compte Bancaire';
      case 'PLATFORM_FEE':
        return 'Frais de Service (1%)';
      default:
        return 'Opération Financière';
    }
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Relevé des Transactions Financières
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Grand livre comptable de vos entrées, sorties de fonds, rechargements et commissions de tiers de confiance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            className="text-xs border border-slate-200 dark:border-slate-800"
          >
            <Download size={14} />
            Exporter Relevé (CSV)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/wallet')}
            className="text-xs"
          >
            <Wallet size={14} />
            Gérer le Portefeuille
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white dark:from-[#131820] to-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Flux Entrants (Crédits Reçus)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-2">
            + {formatFCFA(totalIn)}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Ventes libérées &amp; rechargements
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white dark:from-[#131820] to-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Flux Sortants (Débits Consignés)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            - {formatFCFA(totalOut)}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Achats séquestrés &amp; virements bancaires
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white dark:from-[#131820] to-[#7B3DFF]/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Commissions TRUST (1%)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#7B3DFF] dark:text-[#a277ff] mt-2">
            {formatFCFA(totalFees)}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Tarif transparent et fixe garanti
          </span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence FLUX, libellé comptable..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs sm:text-sm text-slate-900 dark:text-[#F4F6FC] focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Direction Selector */}
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Tous les sens (Entrées &amp; Sorties)</option>
              <option value="IN">Entrées uniquement (+ Crédits)</option>
              <option value="OUT">Sorties uniquement (- Débits)</option>
            </select>

            {/* Payment Method Selector */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Toutes les méthodes de règlement</option>
              <option value="WAVE">Wave Sénégal</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="BANK_TRANSFER">Virement Bancaire</option>
              <option value="ESCROW_BALANCE">Solde Séquestre</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Desktop Ledger Table */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#0E131C]">
                <tr>
                  <th className="py-3.5 px-4">Sens &amp; Réf</th>
                  <th className="py-3.5 px-4">Date &amp; Heure</th>
                  <th className="py-3.5 px-4">Libellé de l'Opération</th>
                  <th className="py-3.5 px-4">Canal de Règlement</th>
                  <th className="py-3.5 px-4">Frais Inclus</th>
                  <th className="py-3.5 px-4 text-right">Montant Mouvementé</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Aucune transaction comptable trouvée.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t, idx) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors opacity-0 animate-enter"
                      style={{
                        animationFillMode: 'forwards',
                        animationDelay: `${idx * 40}ms`,
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              t.direction === 'IN'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.direction === 'IN' ? (
                              <ArrowDownLeft size={15} />
                            ) : (
                              <ArrowUpRight size={15} />
                            )}
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-slate-900 dark:text-[#F4F6FC] block">
                              {t.reference}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {getTypeLabel(t.type)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>

                      <td className="py-4 px-4 max-w-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {t.description}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {getMethodBadge(t.payment_method)}
                      </td>

                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                        {t.fee > 0 ? formatFCFA(t.fee) : '0 FCFA'}
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm ${
                            t.direction === 'IN'
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {t.direction === 'IN' ? '+ ' : '- '}
                          {formatFCFA(t.amount)}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : t.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {t.status === 'COMPLETED' ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <Clock size={11} />
                          )}{' '}
                          {t.status === 'COMPLETED'
                            ? 'Confirmé'
                            : t.status === 'FAILED'
                            ? 'Échoué'
                            : 'En attente'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {t.related_escrow_id ? (
                          <button
                            onClick={() => navigate(`/escrow/${t.related_escrow_id}`)}
                            className="text-[#7B3DFF] hover:underline font-bold text-xs inline-flex items-center gap-1"
                          >
                            <span>Dossier</span>
                            <ExternalLink size={12} />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Ledger Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t, idx) => (
          <Card
            key={t.id}
            className="p-4 space-y-3 opacity-0 animate-enter"
            style={{
              animationFillMode: 'forwards',
              animationDelay: `${idx * 50}ms`,
            } as React.CSSProperties}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    t.direction === 'IN'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.direction === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {t.reference}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{formatDate(t.date)}</span>
                </div>
              </div>

              <span
                className={`font-black text-sm ${
                  t.direction === 'IN' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                }`}
              >
                {t.direction === 'IN' ? '+ ' : '- '}
                {formatFCFA(t.amount)}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {t.description}
            </p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>{getMethodBadge(t.payment_method)}</div>
              {t.related_escrow_id && (
                <button
                  onClick={() => navigate(`/escrow/${t.related_escrow_id}`)}
                  className="text-[#7B3DFF] font-bold text-xs"
                >
                  Voir l'escrow →
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
