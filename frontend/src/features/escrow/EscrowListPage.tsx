import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  PlusCircle,
  Search,
  Clock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { formatFCFA, formatDate, getRemainingTime } from '@/lib/utils';
import { EscrowTransaction, EscrowStatus } from '@/types/escrow';
import { useAuth } from '@/context/AuthContext';
import { canCreateEscrow } from '@/lib/roles';

export const EscrowListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [escrows, setEscrows] = useState<EscrowTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'buyer' | 'seller'>('ALL');
  const [copiedOtpId, setCopiedOtpId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEscrows = async () => {
      setLoading(true);
      try {
        const res = await api.getPayments();
        setEscrows(Array.isArray(res) ? res : []);
      } catch {
        setEscrows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEscrows();
  }, []);

  const copyOtp = (e: React.MouseEvent, id: string | number, otp: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(otp);
    setCopiedOtpId(id);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  // Calculations for KPI Cards
  const activeEscrows = escrows.filter((e) => e.status === 'BLOCKED');
  const totalBlockedAmount = activeEscrows.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const disputedCount = escrows.filter((e) => e.status === 'DISPUTED').length;
  const completedCount = escrows.filter((e) => e.status === 'RELEASED').length;

  // Filtered escrows
  const filtered = escrows.filter((item) => {
    const matchesSearch =
      (item.item_title && item.item_title.toLowerCase().includes(search.toLowerCase())) ||
      (item.reference && item.reference.toLowerCase().includes(search.toLowerCase())) ||
      (item.seller_username && item.seller_username.toLowerCase().includes(search.toLowerCase())) ||
      (item.buyer_username && item.buyer_username.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || item.role_current_user === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
              Contrats d'Escrow &amp; Séquestres
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] border border-[#7B3DFF]/20">
              {activeEscrows.length} en cours
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervisez vos fonds consignés, l'état de livraison, vos codes OTP secrets et la libération sécurisée.
          </p>
        </div>

        {canCreateEscrow(user) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/escrow/new')}
            className="text-xs"
          >
            <PlusCircle size={14} />
            Créer un Séquestre
          </Button>
        )}
      </div>

      {/* Escrow Specific KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-[#7B3DFF]/30 bg-gradient-to-br from-white dark:from-[#131820] to-[#7B3DFF]/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fonds Bloqués Actifs
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center">
              <Lock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatFCFA(totalBlockedAmount)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#00E5FF] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
            <span>{activeEscrows.length} transactions sous garantie</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Séquestres Finalisés
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {completedCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-2">
            Fonds libérés aux vendeurs
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Codes OTP en Attente
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <KeyRound size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {activeEscrows.length}
          </p>
          <span className="text-[11px] text-slate-400 block mt-2">
            Livraisons à confirmer physiquement
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Litiges &amp; Médiations
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {disputedCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-2">
            Arbitrage officiel TRUST
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence d'accord, bien séquestré, utilisateur..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs sm:text-sm text-slate-900 dark:text-[#F4F6FC] focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Tous les statuts de séquestre</option>
              <option value="BLOCKED">Fonds Séquestrés (En cours)</option>
              <option value="RELEASED">Fonds Libérés (Terminé)</option>
              <option value="DISPUTED">En Litige (Arbitrage)</option>
              <option value="REFUNDED">Remboursés</option>
              <option value="CREATED">Créés (En attente de consignation)</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
            >
              <option value="ALL">Tous les contrats</option>
              <option value="buyer">Mes Achats Protégés</option>
              <option value="seller">Mes Ventes sous Séquestre</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Escrow Agreements List (Detailed Cards View) */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-slate-400">
            Aucun contrat de séquestre ne correspond à vos filtres.
          </Card>
        ) : (
          filtered.map((item, idx) => {
            const isBuyer = item.role_current_user === 'buyer';
            const counterpart = isBuyer ? item.seller_username : item.buyer_username;
            const remaining = getRemainingTime(item.auto_release_at);

            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/escrow/${item.id}`)}
                className="p-5 sm:p-6 cursor-pointer hover:border-[#7B3DFF]/50 transition-all group opacity-0 animate-enter"
                style={{
                  animationFillMode: 'forwards',
                  animationDelay: `${idx * 60}ms`,
                } as React.CSSProperties}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info & Title */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#7B3DFF] px-2.5 py-0.5 rounded-lg bg-[#7B3DFF]/10 border border-[#7B3DFF]/20">
                        {item.reference || `ID #${item.id}`}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isBuyer
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isBuyer ? 'Acheteur (Fonds Consignés)' : 'Vendeur (Bénéficiaire)'}
                      </span>

                      <Badge status={item.status} />

                      <span className="text-[11px] text-slate-400">
                        Créé le {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F4F6FC] group-hover:text-[#7B3DFF] transition-colors">
                      {item.item_title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.item_description || 'Conditions standards de séquestre.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span>
                        Partenaire : <strong className="text-slate-800 dark:text-slate-200">@{counterpart}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Remise : <strong className="text-slate-800 dark:text-slate-200">{item.delivery_terms || 'Remise en main propre contre OTP'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Middle / Right: Financials, Timer & OTP Badge */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="text-xs text-slate-400 block">Valeur Séquestrée</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {formatFCFA(item.amount)}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Frais 1%: {formatFCFA(item.fee_amount || Math.round(item.amount * 0.01))}
                      </span>
                    </div>

                    {/* Auto release timer if active */}
                    {item.status === 'BLOCKED' && item.auto_release_at && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-semibold">
                        <Clock size={12} />
                        <span>Auto-libération dans {remaining.formatted}</span>
                      </div>
                    )}

                    {/* Buyer OTP quick copy button */}
                    {item.status === 'BLOCKED' && isBuyer && item.delivery_otp && (
                      <button
                        onClick={(e) => copyOtp(e, item.id, item.delivery_otp!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B0F14] border border-[#7B3DFF]/40 text-[#00E5FF] text-[11px] font-mono font-bold hover:border-[#00E5FF] transition-all"
                        title="Code de déblocage livraison"
                      >
                        <KeyRound size={12} className="text-[#7B3DFF]" />
                        <span>OTP : {item.delivery_otp}</span>
                        {copiedOtpId === item.id ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} className="text-slate-400 hover:text-white" />
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-1 text-xs font-bold text-[#7B3DFF] group-hover:translate-x-1 transition-transform">
                      <span>Gérer le dossier</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

                {/* Progress bar visual for Escrow lifecycle */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-center">
                    <div className="flex items-center gap-1.5 justify-center text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Accord Signé</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 justify-center ${
                        item.status !== 'CREATED' ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === 'BLOCKED'
                            ? 'bg-[#00E5FF] animate-pulse'
                            : item.status !== 'CREATED'
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                      <span>Fonds Consignés</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 justify-center ${
                        item.status === 'RELEASED'
                          ? 'text-emerald-500'
                          : item.status === 'BLOCKED'
                          ? 'text-[#7B3DFF]'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === 'RELEASED'
                            ? 'bg-emerald-500'
                            : item.status === 'BLOCKED'
                            ? 'bg-[#7B3DFF] animate-pulse'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                      <span>Livraison &amp; OTP</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 justify-center ${
                        item.status === 'RELEASED'
                          ? 'text-emerald-500 font-bold'
                          : item.status === 'DISPUTED'
                          ? 'text-rose-500 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === 'RELEASED'
                            ? 'bg-emerald-500'
                            : item.status === 'DISPUTED'
                            ? 'bg-rose-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                      <span>{item.status === 'DISPUTED' ? 'Litige Ouvert' : 'Fonds Libérés'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
