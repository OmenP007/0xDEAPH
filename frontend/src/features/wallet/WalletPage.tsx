import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  X,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatFCFA, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { EscrowTransaction, WalletSummary, WalletTransaction } from '@/types/escrow';
import { WaveLogo, OrangeMoneyLogo, MtnLogo } from '@/components/ui/PaymentLogos';

interface WalletMovement {
  id: string | number;
  type: 'IN' | 'OUT';
  title: string;
  method?: 'wave' | 'orange' | 'mtn' | 'bank' | 'escrow';
  date: string;
  /** Raw ISO timestamp used for reliable chronological sorting. */
  timestamp: number;
  amount: number;
  phone?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'BLOCKED';
}

const UI_TO_API_METHOD: Record<'wave' | 'orange' | 'mtn', string> = {
  wave: 'WAVE',
  orange: 'ORANGE_MONEY',
  mtn: 'MTN_MOMO',
};

const API_TO_UI_METHOD: Record<string, WalletMovement['method']> = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange',
  MTN_MOMO: 'mtn',
  BANK_TRANSFER: 'bank',
};

const METHOD_LABEL: Record<'wave' | 'orange' | 'mtn' | 'bank', string> = {
  wave: 'Wave',
  orange: 'Orange Money',
  mtn: 'MTN MoMo',
  bank: 'Virement bancaire',
};

const STATUS_LABEL: Record<WalletMovement['status'], string> = {
  COMPLETED: 'Confirmé ✓',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  BLOCKED: 'Consigné',
};

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [payments, setPayments] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTopup, setShowTopup] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Top-up state
  const [topupAmount, setTopupAmount] = useState(25000);
  const [topupMethod, setTopupMethod] = useState<'wave' | 'orange' | 'mtn'>('wave');
  const [topupPhone, setTopupPhone] = useState(user?.phone || '');
  const [topupProcessing, setTopupProcessing] = useState(false);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState(10000);
  const [withdrawMethod, setWithdrawMethod] = useState<'wave' | 'orange' | 'mtn'>('wave');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [withdrawName, setWithdrawName] = useState(
    user?.full_name || user?.username || ''
  );
  const [withdrawProcessing, setWithdrawProcessing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const balance = Number(summary?.available_balance ?? 0);
  const totalBalance = Number(summary?.balance ?? 0);
  const walletId = summary?.wallet_id ||
    `TRUST-${(user?.username || 'WALLET').toUpperCase()}-${String(user?.id || 1).padStart(2, '0')}`;

  const loadWallet = async () => {
    setLoading(true);
    const [walletRes, paymentsRes] = await Promise.allSettled([
      api.getWallet(),
      api.getPayments(),
    ]);
    if (walletRes.status === 'fulfilled') {
      setSummary(walletRes.value);
      setWalletTransactions(walletRes.value.transactions || []);
    } else {
      setSummary(null);
      setWalletTransactions([]);
      setNotice({
        text: walletRes.reason?.message || 'Impossible de charger le portefeuille.',
        type: 'error',
      });
    }
    setPayments(paymentsRes.status === 'fulfilled' ? paymentsRes.value : []);
    setLoading(false);
  };

  useEffect(() => {
    loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!topupPhone && user?.phone) setTopupPhone(user.phone);
    if (!withdrawPhone && user?.phone) setWithdrawPhone(user.phone);
    if (!withdrawName && (user?.full_name || user?.username)) {
      setWithdrawName(user.full_name || user.username);
    }
  }, [user?.phone, user?.full_name, user?.username, topupPhone, withdrawPhone, withdrawName]);

  // Escrow movements derived from real payment statuses.
  const escrowMovements: WalletMovement[] = payments.map((p) => {
    const isBuyer = p.role_current_user === 'buyer' || p.buyer_username === user?.username;
    let status: WalletMovement['status'] = 'PENDING';
    if (p.status === 'BLOCKED') status = 'BLOCKED';
    else if (p.status === 'RELEASED' || p.status === 'REFUNDED') status = 'COMPLETED';
    else if (p.status === 'DISPUTED') status = 'PENDING';

    return {
      id: `escrow-${p.id}`,
      type: isBuyer ? 'OUT' : 'IN',
      title: `${isBuyer ? 'Séquestre' : 'Règlement'} ${p.item_title || 'Transaction'}`,
      method: 'escrow',
      date: formatDate(p.created_at),
      timestamp: new Date(p.created_at).getTime(),
      amount: Number(isBuyer ? p.amount : p.net_amount || p.amount),
      status,
    };
  });

  const walletMovements: WalletMovement[] = walletTransactions.map((t) => ({
    id: t.id,
    type: t.type === 'TOPUP' ? 'IN' : 'OUT',
    title:
      t.type === 'TOPUP'
        ? `Rechargement ${t.method_label || METHOD_LABEL[API_TO_UI_METHOD[t.method] as keyof typeof METHOD_LABEL] || t.method}`
        : `Retrait vers ${t.method_label || METHOD_LABEL[API_TO_UI_METHOD[t.method] as keyof typeof METHOD_LABEL] || t.method}`,
    method: API_TO_UI_METHOD[t.method] || 'bank',
    date: formatDate(t.completed_at || t.created_at),
    timestamp: new Date(t.completed_at || t.created_at).getTime(),
    amount: Number(t.amount),
    phone: t.phone,
    status: t.status,
  }));

  const allTransactions = [...walletMovements, ...escrowMovements].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  // ─── TOPUP SUBMIT ────────────────────────────────────────────────────────
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount < 1000) {
      setNotice({ text: 'Le montant minimum de rechargement est de 1 000 FCFA.', type: 'error' });
      return;
    }
    setTopupProcessing(true);
    try {
      await api.requestTopup({
        amount: topupAmount,
        method: UI_TO_API_METHOD[topupMethod],
        phone: topupPhone,
      });
      await loadWallet();
      setShowTopup(false);
      setNotice({
        text: `Demande de rechargement de ${formatFCFA(topupAmount)} enregistrée. Elle sera créditée après confirmation de l'opérateur.`,
        type: 'success',
      });
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      setNotice({
        text: err.message || "Impossible d'enregistrer la demande de rechargement.",
        type: 'error',
      });
    } finally {
      setTopupProcessing(false);
    }
  };

  // ─── WITHDRAW SUBMIT ─────────────────────────────────────────────────────
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    if (withdrawAmount < 1000) {
      setWithdrawError('Le montant minimum de retrait est de 1 000 FCFA.');
      return;
    }
    if (withdrawAmount > balance) {
      setWithdrawError(`Solde insuffisant (${formatFCFA(balance)} disponible).`);
      return;
    }

    setWithdrawProcessing(true);
    try {
      await api.requestWithdraw({
        amount: withdrawAmount,
        method: UI_TO_API_METHOD[withdrawMethod],
        phone: withdrawPhone,
        beneficiary_name: withdrawName,
      });
      await loadWallet();
      setShowWithdraw(false);
      setNotice({
        text: `Demande de retrait de ${formatFCFA(withdrawAmount)} enregistrée. Le montant est réservé jusqu'à confirmation par un administrateur.`,
        type: 'success',
      });
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      setWithdrawError(err.message || "Impossible d'enregistrer la demande de retrait.");
    } finally {
      setWithdrawProcessing(false);
    }
  };

  const copyWalletId = () => {
    navigator.clipboard.writeText(walletId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6 animate-page-enter max-w-5xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
          Portefeuille Mobile Money
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Dépôts et retraits Mobile Money — les mouvements sont crédités après confirmation du fournisseur ou d'un administrateur.
        </p>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-enter ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── ANIMATED WALLET CARD STACK & ACTION BAR ─────────────────────── */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12 py-3">
        {/* ── Wallet CSS ── */}
        <style>{`
          .trust-wallet {
            position: relative;
            width: 290px;
            height: 240px;
            cursor: pointer;
            perspective: 1000px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
            transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
            flex-shrink: 0;
          }
          .trust-wallet:hover {
            transform: translateY(-4px);
          }
          .trust-wallet-back {
            position: absolute;
            bottom: 0;
            width: 290px;
            height: 210px;
            background: linear-gradient(160deg, #1e1235 0%, #0e0920 100%);
            border-radius: 22px 22px 60px 60px;
            z-index: 5;
            box-shadow:
              inset 0 25px 35px rgba(0,0,0,0.45),
              inset 0 5px 15px rgba(0,0,0,0.5),
              0 20px 60px rgba(123,61,255,0.18);
          }
          @keyframes trust-slide-pocket {
            0%   { transform: translateY(-110px); opacity: 0; }
            60%  { transform: translateY(4px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .trust-card {
            position: absolute;
            width: 268px;
            height: 145px;
            left: 11px;
            border-radius: 16px;
            padding: 18px;
            color: white;
            box-shadow:
              inset 0 1px 1px rgba(255,255,255,0.2),
              0 -4px 15px rgba(0,0,0,0.1);
            transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: trust-slide-pocket 0.75s cubic-bezier(0.16,1,0.3,1) backwards;
          }
          .trust-card-inner {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
          }
          .trust-card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
          }
          .trust-chip {
            width: 30px;
            height: 22px;
            background: rgba(255,255,255,0.18);
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .trust-card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
          }
          .trust-card-label {
            font-size: 8px;
            opacity: 0.65;
            text-transform: uppercase;
            margin-bottom: 2px;
            display: block;
            letter-spacing: 0.06em;
          }
          .trust-card-value {
            font-size: 10px;
            font-weight: 600;
          }
          .trust-hidden-stars {
            font-size: 15px;
            letter-spacing: 2px;
            transition: opacity 150ms ease;
          }
          .trust-card-number {
            display: none;
            font-size: 12px;
            letter-spacing: 1px;
            font-family: monospace;
          }
          .trust-card-escrow {
            background: linear-gradient(135deg, #7B3DFF 0%, #5a2dc4 100%);
            bottom: 90px;
            z-index: 10;
            animation-delay: 0.1s;
          }
          .trust-card-kyc {
            background: linear-gradient(135deg, #00c4b4 0%, #009688 100%);
            bottom: 65px;
            z-index: 20;
            animation-delay: 0.2s;
          }
          .trust-card-paylink {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            bottom: 40px;
            z-index: 30;
            animation-delay: 0.3s;
            border: 1px solid rgba(123,61,255,0.3);
          }
          .trust-pocket {
            position: absolute;
            bottom: 0;
            width: 290px;
            height: 165px;
            z-index: 40;
            filter: drop-shadow(0 15px 25px rgba(20,10,40,0.5));
          }
          .trust-pocket-content {
            position: absolute;
            top: 45px;
            width: 100%;
            text-align: center;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .trust-balance-hidden {
            color: #6b4fa3;
            font-size: 22px;
            letter-spacing: 4px;
            transition: opacity 300ms cubic-bezier(0.4,0,0.2,1),
                        transform 300ms cubic-bezier(0.4,0,0.2,1);
          }
          .trust-balance-real {
            color: #b69ce0;
            font-size: 20px;
            font-weight: 700;
            opacity: 0;
            position: absolute;
            top: 0; left: 50%;
            transform: translate(-50%, 8px);
            transition: opacity 300ms cubic-bezier(0.4,0,0.2,1),
                        transform 300ms cubic-bezier(0.4,0,0.2,1);
            white-space: nowrap;
          }
          .trust-wallet:hover .trust-card-escrow { transform: translateY(-80px) rotate(-3deg); }
          .trust-wallet:hover .trust-card-kyc    { transform: translateY(-48px) rotate(2.5deg); }
          .trust-wallet:hover .trust-card-paylink { transform: translateY(-14px); }
          .trust-card:hover {
            z-index: 100 !important;
            transition-delay: 0s !important;
          }
          .trust-wallet:hover .trust-card-escrow:hover  { transform: translateY(-65px) scale(1.06) rotate(0); }
          .trust-wallet:hover .trust-card-kyc:hover     { transform: translateY(-72px) scale(1.06) rotate(0); }
          .trust-wallet:hover .trust-card-paylink:hover { transform: translateY(-65px) scale(1.06) rotate(0); }
          .trust-card:hover .trust-hidden-stars { display: none; }
          .trust-card:hover .trust-card-number  { display: block; }
          .trust-wallet:hover .trust-balance-hidden {
            opacity: 0;
            transform: translateY(-4px);
          }
          .trust-wallet:hover .trust-balance-real {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        `}</style>

        {/* Interactive Wallet Graphic */}
        <div className="trust-wallet">
          <div className="trust-wallet-back" />

          {/* Card 1 — Escrow */}
          <div className="trust-card trust-card-escrow">
            <div className="trust-card-inner">
              <div className="trust-card-top">
                <span>Compte Séquestre</span>
                <div className="trust-chip" />
              </div>
              <div className="trust-card-bottom">
                <div>
                  <span className="trust-card-label">Titulaire</span>
                  <span className="trust-card-value">{user?.username?.toUpperCase() || 'CLIENT'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="trust-hidden-stars">**** 7B3D</span>
                  <span className="trust-card-number">TRUST 7B3D FF00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Mobile Money Partners */}
          <div className="trust-card trust-card-kyc">
            <div className="trust-card-inner">
              <div className="trust-card-top">
                <span>Mobile Money</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold">WAVE • OM • MTN</span>
                </div>
              </div>
              <div className="trust-card-bottom">
                <div>
                  <span className="trust-card-label">Région</span>
                  <span className="trust-card-value">UEMOA / AFRIQUE</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="trust-hidden-stars">**** 00E5</span>
                  <span className="trust-card-number">SÉNÉGAL / CI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Paylink */}
          <div className="trust-card trust-card-paylink">
            <div className="trust-card-inner">
              <div className="trust-card-top">
                <span>Solde Disponible</span>
                <div className="trust-chip" />
              </div>
              <div className="trust-card-bottom">
                <div>
                  <span className="trust-card-label">Devise</span>
                  <span className="trust-card-value">FCFA (XOF)</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="trust-hidden-stars">**** 4242</span>
                  <span className="trust-card-number">ESCROW ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pocket */}
          <div className="trust-pocket">
            <svg viewBox="0 0 290 165" fill="none">
              <path
                d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 250 25 C 265 25, 270 10, 280 10 C 285 10, 290 10, 290 20 L 290 120 C 290 155, 270 165, 250 165 L 40 165 C 20 165, 0 155, 0 120 Z"
                fill="#0e0920"
              />
              <path
                d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 250 29 C 263 29, 267 16, 275 16 C 278 16, 282 16, 282 22 L 282 120 C 282 150, 265 155, 250 155 L 40 155 C 25 155, 8 152, 8 120 Z"
                stroke="#3d2070"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </svg>

            <div className="trust-pocket-content">
              <div style={{ position: 'relative', height: '28px', width: '100%' }}>
                <div className="trust-balance-hidden">● ● ● ● ● ●</div>
                <div className="trust-balance-real">{formatFCFA(balance)}</div>
              </div>
              <div style={{ color: '#6b4fa3', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
                Solde Disponible
              </div>
            </div>
          </div>
        </div>

        {/* ── Balance Details & Direct Actions ── */}
        <div className="flex-1 space-y-4 w-full max-w-md">
          {/* Main Balance Box */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#131820] via-[#0E131A] to-[#0A0D12] border border-[#7B3DFF]/25 shadow-xl text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7B3DFF] uppercase tracking-widest flex items-center gap-1.5">
                <Wallet size={14} /> Solde Retirable
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Actif
              </span>
            </div>

            <div>
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {loading ? '…' : formatFCFA(balance)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Solde total : {formatFCFA(totalBalance)}
                {Number(summary?.pending_withdrawals ?? 0) > 0
                  ? ` • ${formatFCFA(Number(summary?.pending_withdrawals))} réservés en retraits en attente`
                  : ' • Fonds débloqués prêts pour retrait'}
              </p>
            </div>

            {/* Mobile Money Operators Accepted */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Opérateurs intégrés :</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20" title="Wave">
                  <WaveLogo size={18} />
                  <span className="text-[10px] font-bold text-sky-400">Wave</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20" title="Orange Money">
                  <OrangeMoneyLogo size={18} />
                  <span className="text-[10px] font-bold text-orange-400">Orange</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20" title="MTN Mobile Money">
                  <MtnLogo size={18} />
                  <span className="text-[10px] font-bold text-yellow-400">MTN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account ID / Mobile Money Address */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Identifiant Portefeuille TRUST
              </p>
              <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {walletId}
              </code>
            </div>
            <button
              onClick={copyWalletId}
              className="p-2 rounded-xl text-slate-400 hover:text-[#7B3DFF] hover:bg-[#7B3DFF]/10 transition-colors shrink-0"
              title="Copier l'identifiant"
            >
              {copiedId ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Direct Action Buttons: Approvisionner & Retirer */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowTopup(true)}
              className="text-xs sm:text-sm font-bold gap-2 rounded-2xl shadow-lg shadow-[#7B3DFF]/20"
            >
              <ArrowDownLeft size={17} />
              Approvisionner
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setWithdrawError(null);
                setShowWithdraw(true);
              }}
              className="text-xs sm:text-sm font-bold gap-2 rounded-2xl"
            >
              <ArrowUpRight size={17} />
              Retirer des fonds
            </Button>
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION HISTORY ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span>Historique des Mouvements</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
              {allTransactions.length}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Dépôts, retraits et séquestres</span>
          </div>
        </CardHeader>
        <CardContent>
          {allTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Wallet size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p>Aucun mouvement de fonds enregistré pour le moment.</p>
              <p className="text-[11px] text-slate-500">
                Approvisionnez votre compte ou recevez des fonds pour voir vos transactions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {allTransactions.map((t, i) => (
                <div
                  key={t.id}
                  className="py-3.5 flex items-center justify-between text-xs opacity-0 animate-enter hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-2 rounded-xl transition-colors"
                  style={{
                    animationFillMode: 'forwards',
                    animationDelay: `${Math.min(i * 40, 400)}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Method Icon / Logo */}
                    <div className="shrink-0">
                      {t.method === 'wave' ? (
                        <WaveLogo size={32} />
                      ) : t.method === 'orange' ? (
                        <OrangeMoneyLogo size={32} />
                      ) : t.method === 'mtn' ? (
                        <MtnLogo size={32} />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            t.type === 'IN'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {t.type === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 dark:text-[#F4F6FC] flex items-center gap-1.5">
                        <span>{t.title}</span>
                        {t.phone && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({t.phone.startsWith('+') ? t.phone : `+221 ${t.phone}`})
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-slate-400">{t.date}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm block ${
                        t.type === 'IN' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {t.type === 'IN' ? `+${formatFCFA(t.amount)}` : `-${formatFCFA(t.amount)}`}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-bold ${
                        t.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : t.status === 'FAILED'
                          ? 'text-rose-400'
                          : t.status === 'BLOCKED'
                          ? 'text-[#7B3DFF]'
                          : 'text-amber-400'
                      }`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── MODAL 1: APPROVISIONNER (DÉPÔT WAVE / ORANGE / MTN) ─────────── */}
      {showTopup && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center"
          onClick={() => setShowTopup(false)}
        >
          <div
            className="relative bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-modal-enter my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Approvisionner le Solde
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dépôt immédiat sans frais bancaires
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTopup(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTopupSubmit} className="space-y-4">
              {/* Operator Selection with Real Logos */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Choisir l'opérateur Mobile Money
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Wave */}
                  <button
                    type="button"
                    onClick={() => setTopupMethod('wave')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      topupMethod === 'wave'
                        ? 'border-[#1EA7FD] bg-[#1EA7FD]/10 shadow-[0_0_0_3px_rgba(30,167,253,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <WaveLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Wave</span>
                    <span className="text-[9px] font-semibold text-[#1EA7FD]">0% frais</span>
                  </button>

                  {/* Orange Money */}
                  <button
                    type="button"
                    onClick={() => setTopupMethod('orange')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      topupMethod === 'orange'
                        ? 'border-[#FF7900] bg-[#FF7900]/10 shadow-[0_0_0_3px_rgba(255,121,0,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <OrangeMoneyLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Orange</span>
                    <span className="text-[9px] font-semibold text-[#FF7900]">Push direct</span>
                  </button>

                  {/* MTN MoMo */}
                  <button
                    type="button"
                    onClick={() => setTopupMethod('mtn')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      topupMethod === 'mtn'
                        ? 'border-[#FFCC00] bg-[#FFCC00]/10 shadow-[0_0_0_3px_rgba(255,204,0,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <MtnLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">MTN MoMo</span>
                    <span className="text-[9px] font-semibold text-[#FFCC00]">Instant</span>
                  </button>
                </div>
              </div>

              {/* Amount with quick select buttons */}
              <div className="space-y-1.5">
                <Input
                  label="Montant du rechargement (FCFA)"
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  min="1000"
                  step="1000"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[5000, 10000, 25000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopupAmount(preset)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        topupAmount === preset
                          ? 'border-[#7B3DFF] bg-[#7B3DFF]/15 text-[#7B3DFF]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {formatFCFA(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <Input
                  label="Numéro Mobile Money du débit"
                  value={topupPhone}
                  onChange={(e) => setTopupPhone(e.target.value)}
                  placeholder="ex: 77 123 45 67"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Une validation par notification push ou code USSD sera requise sur ce numéro.
                </p>
              </div>

              {/* Summary box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Montant brut :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatFCFA(topupAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Frais de rechargement :</span>
                  <span className="font-bold text-emerald-400">GRATUIT (0 FCFA)</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Montant demandé :</span>
                  <span className="text-emerald-400">{formatFCFA(topupAmount)}</span>
                </div>
                <p className="text-[10px] text-amber-500 pt-1">
                  Le crédit interviendra après confirmation de l'opérateur Mobile Money.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowTopup(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={topupProcessing} className="gap-1.5">
                  <Check size={14} />
                  Valider le Rechargement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: RETIRER (RETRAIT INSTANTANÉ WAVE / ORANGE / MTN) ─────── */}
      {showWithdraw && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center"
          onClick={() => setShowWithdraw(false)}
        >
          <div
            className="relative bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-modal-enter my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#7B3DFF]/15 text-[#7B3DFF] flex items-center justify-center">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Retirer vos Fonds
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Virement direct vers votre compte Mobile Money
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdraw(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Destination Operator */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Destination du virement
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Wave */}
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('wave')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      withdrawMethod === 'wave'
                        ? 'border-[#1EA7FD] bg-[#1EA7FD]/10 shadow-[0_0_0_3px_rgba(30,167,253,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <WaveLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Wave</span>
                    <span className="text-[9px] font-semibold text-[#1EA7FD]">Instantané</span>
                  </button>

                  {/* Orange Money */}
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('orange')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      withdrawMethod === 'orange'
                        ? 'border-[#FF7900] bg-[#FF7900]/10 shadow-[0_0_0_3px_rgba(255,121,0,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <OrangeMoneyLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Orange</span>
                    <span className="text-[9px] font-semibold text-[#FF7900]">Instantané</span>
                  </button>

                  {/* MTN MoMo */}
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('mtn')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      withdrawMethod === 'mtn'
                        ? 'border-[#FFCC00] bg-[#FFCC00]/10 shadow-[0_0_0_3px_rgba(255,204,0,0.18)] scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <MtnLogo size={32} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">MTN MoMo</span>
                    <span className="text-[9px] font-semibold text-[#FFCC00]">Instantané</span>
                  </button>
                </div>
              </div>

              {/* Amount to withdraw */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Montant à retirer (FCFA)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balance)}
                    className="text-[10px] font-bold text-[#7B3DFF] hover:underline"
                  >
                    Tout retirer ({formatFCFA(balance)})
                  </button>
                </div>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  min="1000"
                  max={balance}
                  step="1000"
                  required
                />
              </div>

              {/* Beneficiary Phone */}
              <Input
                label="Numéro du bénéficiaire"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                placeholder="ex: 77 123 45 67"
                required
              />

              {/* Beneficiary Name */}
              <Input
                label="Nom complet du titulaire"
                value={withdrawName}
                onChange={(e) => setWithdrawName(e.target.value)}
                placeholder="ex: Mamadou Diallo"
                required
              />

              {/* Summary box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Solde disponible :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatFCFA(balance)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Montant viré :</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatFCFA(withdrawAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Nouveau solde restant :</span>
                  <span className="text-[#7B3DFF]">
                    {formatFCFA(Math.max(0, balance - withdrawAmount))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowWithdraw(false)}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={withdrawProcessing}
                  disabled={balance <= 0 || withdrawAmount > balance}
                  className="gap-1.5"
                >
                  <ArrowUpRight size={14} />
                  Confirmer le Retrait
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
