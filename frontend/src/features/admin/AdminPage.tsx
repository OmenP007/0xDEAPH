import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Search,
  ArrowRight,
  Filter,
  DollarSign,
  Lock,
  UserCheck,
  Building,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  Settings,
  Sliders,
  Megaphone,
  Zap,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { Dispute, KYCVerification, EscrowTransaction } from '@/types/escrow';
import {
  getPlatformSettings,
  savePlatformSettings,
  loadPlatformSettings,
  PlatformSettings,
  BroadcastAnnouncement,
} from '@/lib/platform-settings';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, openBroadcastModal } = useToast();

  const [activeTab, setActiveTab] = useState<'disputes' | 'kyc' | 'escrows' | 'settings'>('disputes');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [kycList, setKycList] = useState<KYCVerification[]>([]);
  const [escrows, setEscrows] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Platform Settings & Auto-Release state
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings);
  const [autoReleaseDays, setAutoReleaseDays] = useState<number>(platformSettings.autoReleaseDelayDays);
  const [commissionPercent, setCommissionPercent] = useState<number>(platformSettings.commissionRatePercent);
  const [annTitle, setAnnTitle] = useState(platformSettings.announcement?.title || '');
  const [annMessage, setAnnMessage] = useState(platformSettings.announcement?.message || '');
  const [annImage, setAnnImage] = useState(platformSettings.announcement?.imageUrl || '');
  const [annBadge, setAnnBadge] = useState(platformSettings.announcement?.badge || 'Information');
  const [annActionText, setAnnActionText] = useState(platformSettings.announcement?.actionText || 'En savoir plus');
  const [annActionUrl, setAnnActionUrl] = useState(platformSettings.announcement?.actionUrl || '#');
  const [annEnabled, setAnnEnabled] = useState(platformSettings.announcement?.enabled ?? false);
  const [triggeringRelease, setTriggeringRelease] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Dispute Arbitration Modal State
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [arbitrationAction, setArbitrationAction] = useState<'refund' | 'release'>('refund');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeSuccessMsg, setDisputeSuccessMsg] = useState<string | null>(null);
  const [arbitrationError, setArbitrationError] = useState<string | null>(null);

  // KYC Review State
  const [selectedKyc, setSelectedKyc] = useState<KYCVerification | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [showKycRejectModal, setShowKycRejectModal] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [disp, payments, kyc] = await Promise.all([
          api.getDisputes().catch(() => []),
          api.getPayments().catch(() => []),
          api.getAllKYC().catch(() => []),
        ]);
        setDisputes(Array.isArray(disp) ? disp : []);
        setEscrows(Array.isArray(payments) ? payments : []);
        setKycList(Array.isArray(kyc) ? kyc : []);
      } catch {
        setDisputes([]);
        setEscrows([]);
        setKycList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    loadPlatformSettings()
      .then((settings) => {
        setPlatformSettings(settings);
        setAutoReleaseDays(settings.autoReleaseDelayDays);
        setCommissionPercent(settings.commissionRatePercent);
        setAnnTitle(settings.announcement?.title || '');
        setAnnMessage(settings.announcement?.message || '');
        setAnnImage(settings.announcement?.imageUrl || '');
        setAnnBadge(settings.announcement?.badge || 'Information');
        setAnnActionText(settings.announcement?.actionText || 'En savoir plus');
        setAnnActionUrl(settings.announcement?.actionUrl || '#');
        setAnnEnabled(settings.announcement?.enabled ?? false);
      })
      .catch(() => {
        // Keep cached configuration if the API is unreachable.
      });
  }, []);

  // Handle Dispute Resolution
  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setSubmittingDispute(true);
    setDisputeSuccessMsg(null);

    try {
      await api.resolveDispute(selectedDispute.id, arbitrationAction, resolutionNotes);
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDispute.id
            ? {
                ...d,
                status: arbitrationAction === 'release' ? 'RESOLVED_RELEASE' : 'RESOLVED_REFUND',
                resolution_notes: resolutionNotes,
                resolved_at: new Date().toISOString(),
              }
            : d
        )
      );
      setDisputeSuccessMsg('Litige arbitré et exécuté avec succès.');
      setSelectedDispute(null);
      setResolutionNotes('');
    } catch (err: any) {
      setArbitrationError(err.message || "Erreur lors de l'arbitrage");
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Handle KYC Review
  const handleReviewKyc = async (id: string | number, newStatus: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await api.reviewKYC(id, newStatus, reason);
      setKycList((prev) =>
        prev.map((k) =>
          k.id === id
            ? {
                ...k,
                status: newStatus,
                rejection_reason: reason || '',
                reviewed_at: new Date().toISOString(),
              }
            : k
        )
      );
      setKycSuccessMsg(
        newStatus === 'APPROVED'
          ? 'Dossier KYC validé : compte vérifié avec succès.'
          : 'Dossier KYC refusé avec motif notifié.'
      );
      setShowKycRejectModal(false);
      setSelectedKyc(null);
      setKycRejectionReason('');
      setTimeout(() => setKycSuccessMsg(null), 3500);
    } catch (err: any) {
      setKycError(err.message || 'Erreur lors de la mise à jour KYC');
    }
  };

  // Save platform configuration (server-side source of truth)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAnnouncement: BroadcastAnnouncement = {
      id: `ann-${Date.now()}`,
      enabled: annEnabled,
      title: annTitle,
      message: annMessage,
      imageUrl: annImage || undefined,
      badge: annBadge,
      actionText: annActionText,
      actionUrl: annActionUrl,
      targetRole: 'all',
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await savePlatformSettings({
        autoReleaseDelayDays: Number(autoReleaseDays),
        autoReleaseDelayHours: Number(autoReleaseDays) * 24,
        commissionRatePercent: Number(commissionPercent),
        announcement: updatedAnnouncement,
      });

      setPlatformSettings(saved);
      setSettingsSavedMsg(
        'Paramètres de la plateforme et pop-up d\'annonce enregistrés avec succès.'
      );
      showToast({
        type: 'success',
        title: 'Configuration sauvegardée',
        message: `Délai d'auto-libération défini à ${autoReleaseDays} jour(s).`,
      });
      setTimeout(() => setSettingsSavedMsg(null), 4000);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Sauvegarde impossible',
        message: err?.message || 'Le serveur a refusé la configuration.',
      });
    }
  };

  // Immediate manual trigger for expired escrows
  const handleTriggerAutoRelease = async () => {
    setTriggeringRelease(true);
    try {
      const res = await api.triggerAutoRelease();
      if (res.released_count > 0) {
        showToast({
          type: 'success',
          title: 'Auto-libération exécutée',
          message: `${res.released_count} séquestre(s) expiré(s) débloqué(s) avec succès.`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Aucun déblocage effectué',
          message:
            "Aucun séquestre éligible n'a été libéré. La libération automatique reste bloquée tant qu'aucun endpoint de payout GeniusPay n'est disponible.",
        });
      }
      // Refresh escrows
      const updatedPayments = await api.getPayments();
      setEscrows(Array.isArray(updatedPayments) ? updatedPayments : []);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur auto-libération',
        message: err.message || 'Impossible d\'exécuter le déblocage.',
      });
    } finally {
      setTriggeringRelease(false);
    }
  };

  // Live test broadcast modal
  const handlePreviewPopup = () => {
    openBroadcastModal({
      id: 'preview',
      enabled: true,
      title: annTitle || 'Aperçu de la Pop-up TRUST',
      message: annMessage || 'Ceci est un aperçu en temps réel de votre pop-up d\'annonce avec image.',
      imageUrl: annImage || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      badge: annBadge || 'Aperçu Direct',
      actionText: annActionText || 'Tester le Bouton',
      actionUrl: annActionUrl || '#',
      createdAt: new Date().toISOString(),
    });
  };

  // Live test toast with image
  const handleTestToast = () => {
    showToast({
      type: 'announcement',
      title: 'Notification Pop-up TRUST',
      message: 'Voici une notification toast riche avec aperçu d\'image !',
      imageUrl: annImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      action: {
        label: 'Voir en détail',
        onClick: () => handlePreviewPopup(),
      },
    });
  };
  const openDisputesCount = disputes.filter((d) => d.status === 'OPEN').length;
  const pendingKycCount = kycList.filter((k) => k.status === 'PENDING').length;
  const totalEscrowVolume = escrows.reduce((sum, e) => sum + e.amount, 0);
  const commissionRate = commissionPercent > 0 ? commissionPercent / 100 : 0.01;
  const totalCommissions = escrows.reduce((sum, e) => sum + (e.fee_amount || Math.round(e.amount * commissionRate)), 0);

  // Defense-in-depth: guard role even if router already blocks.
  // Kept after all hooks so the hook order stays stable across renders.
  if (user?.role !== 'deaph') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* ─── BANNER & ACCREDITATION (brand & banner-design) ────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B0F14] border border-[#7B3DFF]/30 p-6 sm:p-8 text-white shadow-2xl">
        {/* Glow float background */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'rgba(123,61,255,0.18)' }}
        />
        <div
          className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full blur-[90px] pointer-events-none"
          style={{ background: 'rgba(0,229,255,0.1)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B3DFF]/20 border border-[#7B3DFF]/40 text-[#00E5FF] text-[11px] font-mono font-bold tracking-wider uppercase">
              <Scale size={13} />
              <span>Console d'Arbitrage &amp; Conformité FinTech</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Espace Modérateur &amp; Tiers de Confiance
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Tranchez les litiges bloqués, validez les identités légales (KYC UEMOA) et supervisez les séquestres en cours. Les actions financières sont irréversibles et auditées.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="http://localhost:8000/admin/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-md"
            >
              <span>Django Admin (Port 8000)</span>
              <ExternalLink size={14} />
            </a>

            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#131820] border border-slate-800 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>GeniusPay Webhook : <strong>Actif</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUCCESS NOTIFICATIONS ───────────────────────────────────────── */}
      {disputeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-success">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>{disputeSuccessMsg}</span>
          </div>
          <button onClick={() => setDisputeSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {kycSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-success">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>{kycSuccessMsg}</span>
          </div>
          <button onClick={() => setKycSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {arbitrationError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <XCircle size={16} />
            <span>{arbitrationError}</span>
          </div>
          <button onClick={() => setArbitrationError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {kycError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <XCircle size={16} />
            <span>{kycError}</span>
          </div>
          <button onClick={() => setKycError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ─── METRIC CARDS (staggered motion) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white dark:from-[#131820] to-[#7B3DFF]/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Volume Séquestré Global
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center">
              <Lock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatFCFA(totalEscrowVolume)}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Sur l'ensemble des transactions TRUST
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-white dark:from-[#131820] to-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Commissions Encaissées ({commissionPercent.toFixed(2)}%)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-2">
            {formatFCFA(totalCommissions)}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Chiffre d'affaires de la plateforme
          </span>
        </Card>

        <Card className={`p-4 ${openDisputesCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Litiges Ouverts à Arbitrer
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2 flex items-center gap-2">
            {openDisputesCount}
            {openDisputesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Fonds bloqués en attente de décision
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Dossiers KYC en Attente
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-500 mt-2">
            {pendingKycCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">
            Pièces d'identité à examiner
          </span>
        </Card>
      </div>

      {/* ─── TAB NAVIGATION ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'disputes'
              ? 'bg-[#7B3DFF] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale size={15} />
          <span>Médiation des Litiges</span>
          {openDisputesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
              {openDisputesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kyc'
              ? 'bg-[#7B3DFF] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck size={15} />
          <span>Conformité &amp; KYC</span>
          {pendingKycCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
              {pendingKycCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('escrows')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'escrows'
              ? 'bg-[#7B3DFF] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Lock size={15} />
          <span>Supervision des Séquestres</span>
          <span className="text-[10px] text-slate-400 font-mono">({escrows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-[#7B3DFF] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings size={15} />
          <span>Paramètres &amp; Auto-Libération</span>
          {annEnabled && (
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
          )}
        </button>
      </div>

      {/* ─── TAB 1: DISPUTES RESOLUTION ───────────────────────────────────── */}
      {activeTab === 'disputes' && (
        <div className="space-y-4 animate-enter">
          {disputes.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              Aucun litige ouvert sur la plateforme.
            </Card>
          ) : (
            disputes.map((d) => (
              <Card
                key={d.id}
                className={`p-5 sm:p-6 transition-all ${
                  d.status === 'OPEN'
                    ? 'border-rose-500/40 bg-gradient-to-r from-white dark:from-[#131820] to-rose-500/5'
                    : 'opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        Litige #{d.id}
                      </span>
                      <span className="font-mono text-xs text-slate-400 font-bold">
                        Dossier : {d.paiement_reference || `Paiement #${d.paiement}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'OPEN'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {d.status === 'OPEN'
                          ? 'EN ATTENTE D\'ARBITRAGE'
                          : d.status === 'RESOLVED_RELEASE'
                          ? 'RÉSOLU : LIBÉRÉ AU VENDEUR'
                          : 'RÉSOLU : REMBOURSÉ À L\'ACHETEUR'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Signalé le {formatDate(d.created_at)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
                      {d.paiement_title || 'Transaction contestée'}
                    </h3>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                      <p className="font-semibold text-rose-500 flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Motif : {d.reason}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {d.details}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>Acheteur : <strong className="text-slate-700 dark:text-slate-200">@{d.buyer_username || 'acheteur'}</strong></span>
                      <span>•</span>
                      <span>Vendeur : <strong className="text-slate-700 dark:text-slate-200">@{d.seller_username || 'vendeur'}</strong></span>
                    </div>

                    {d.resolution_notes && (
                      <p className="text-xs text-emerald-500 font-medium pt-1">
                        <strong>Verdict rendu :</strong> {d.resolution_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left lg:text-right">
                      <span className="text-xs text-slate-400 block">Fonds Contestés</span>
                      <span className="text-xl font-black text-rose-500">
                        {formatFCFA(d.paiement_amount || 0)}
                      </span>
                    </div>

                    {d.status === 'OPEN' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(d);
                          setResolutionNotes('');
                        }}
                        className="text-xs bg-[#7B3DFF] hover:bg-[#682ad4]"
                      >
                        <Scale size={14} />
                        <span>Rendre la Décision</span>
                      </Button>
                    ) : (
                      <button
                        onClick={() => navigate(`/escrow/${d.paiement}`)}
                        className="text-xs text-[#7B3DFF] font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Voir le contrat</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 2: KYC COMPLIANCE ────────────────────────────────────────── */}
      {activeTab === 'kyc' && (
        <div className="space-y-4 animate-enter">
          {kycList.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              Aucune pièce d'identité en attente de validation.
            </Card>
          ) : (
            kycList.map((k) => (
              <Card key={k.id} className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center shrink-0">
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
                          {k.full_name}
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">
                          (@{k.user_username})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            k.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : k.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {k.status === 'APPROVED' ? 'VÉRIFIÉ' : k.status === 'REJECTED' ? 'REJETÉ' : 'EN REVUE'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4 flex-wrap">
                        <span>Type : <strong>{({
                          cni: 'CNI',
                          passport: 'Passeport',
                          driving_license: 'Permis de conduire',
                        } as Record<string, string>)[k.id_type] || k.id_type}</strong></span>
                        <span>•</span>
                        <span>N° Document : <strong className="font-mono">{k.id_number}</strong></span>
                        <span>•</span>
                        <span>Soumis le : {formatDate(k.submitted_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={k.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Examiner la Pièce</span>
                    </a>

                    {k.status === 'PENDING' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedKyc(k);
                            setShowKycRejectModal(true);
                          }}
                          className="text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                        >
                          <XCircle size={14} />
                          <span>Rejeter</span>
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleReviewKyc(k.id, 'APPROVED')}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={14} />
                          <span>Approuver</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {k.rejection_reason && (
                  <p className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    <strong>Motif du refus :</strong> {k.rejection_reason}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 3: PLATFORM ESCROWS SUPERVISION ─────────────────────────── */}
      {activeTab === 'escrows' && (
        <div className="space-y-4 animate-enter">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#0E131C]">
                  <tr>
                    <th className="py-3.5 px-4">Référence</th>
                    <th className="py-3.5 px-4">Article / Prestation</th>
                    <th className="py-3.5 px-4">Acheteur</th>
                    <th className="py-3.5 px-4">Vendeur</th>
                    <th className="py-3.5 px-4">Montant Séquestré</th>
                    <th className="py-3.5 px-4">Commission {commissionPercent.toFixed(2)}%</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Contrôle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {escrows.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-[#F4F6FC]">
                        {e.reference || `#${e.id}`}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-semibold">
                        {e.item_title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        @{e.buyer_username}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        @{e.seller_username}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatFCFA(e.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-[#7B3DFF] font-semibold">
                        {formatFCFA(e.fee_amount || Math.round(e.amount * 0.01))}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={e.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/escrow/${e.id}`)}
                          className="text-[#7B3DFF] hover:underline font-bold text-xs"
                        >
                          Dossier →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: CONFIGURATION & AUTO-LIBÉRATION & POP-UPS ────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-enter">
          {settingsSavedMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-success">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} />
                <span>{settingsSavedMsg}</span>
              </div>
              <button onClick={() => setSettingsSavedMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── SECTION 1: AUTO-RELEASE CONFIGURATOR ── */}
            <Card className="p-6 space-y-6 border-[#7B3DFF]/30 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] mb-1">
                    <Clock size={12} />
                    <span>Délai Légal de Séquestre</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                    Configuration de l'Auto-Libération
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Définissez la durée au terme de laquelle les fonds séquestrés seront automatiquement libérés au vendeur si l'acheteur n'a ouvert aucun litige.
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Limitation actuelle : GeniusPay n'expose aucun endpoint de payout. Le délai est enregistré,
                      mais la libération effective des fonds reste bloquée jusqu'à activation de ce service.
                    </span>
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#7B3DFF]/10 text-[#7B3DFF]">
                  <Sliders size={20} />
                </div>
              </div>

              {/* Preset delay buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Choisir un délai prédéfini
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { days: 1, label: '24h (1 jour)', desc: 'Prestations digitales / Express' },
                    { days: 2, label: '48h (2 jours)', desc: 'Livraison locale Dakar' },
                    { days: 3, label: '72h (3 jours)', desc: 'Standard recommandé TRUST' },
                    { days: 5, label: '5 jours', desc: 'Envoi régional UEMOA' },
                    { days: 7, label: '7 jours (1 sem.)', desc: 'Fret / Importation' },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setAutoReleaseDays(preset.days)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        autoReleaseDays === preset.days
                          ? 'border-[#7B3DFF] bg-[#7B3DFF]/10 text-[#7B3DFF] ring-2 ring-[#7B3DFF]/30 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold">{preset.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom input */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ou ajustez manuellement le nombre de jours :
                  </label>
                  <span className="font-mono text-sm font-black text-[#7B3DFF]">
                    {autoReleaseDays} jour{autoReleaseDays > 1 ? 's' : ''} ({autoReleaseDays * 24}h)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  step="1"
                  value={autoReleaseDays}
                  onChange={(e) => setAutoReleaseDays(Number(e.target.value))}
                  className="w-full accent-[#7B3DFF] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1 jour</span>
                  <span>3 jours (défaut)</span>
                  <span>7 jours</span>
                  <span>14 jours</span>
                </div>
              </div>

              {/* Live calculate preview */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <Clock size={16} className="shrink-0" />
                <span>
                  <strong>Simulation :</strong> Une transaction consignée maintenant sera auto-libérée le{' '}
                  <strong>
                    {formatDate(new Date(Date.now() + autoReleaseDays * 24 * 3600 * 1000).toISOString())}
                  </strong>.
                </span>
              </div>

              {/* Manual instant force trigger button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Déblocage Forcé Immédiat</p>
                  <p className="text-[11px] text-slate-400">Exécute la tâche Celery sans attendre le cron.</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={triggeringRelease}
                  onClick={handleTriggerAutoRelease}
                  className="text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Zap size={14} />
                  <span>Déclencher l'Auto-Libération</span>
                </Button>
              </div>
            </Card>

            {/* ── SECTION 2: POP-UP NOTIFICATION & IMAGE BROADCASTER ── */}
            <Card className="p-6 space-y-6 border-[#00E5FF]/30 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00E5FF]/10 text-[#00E5FF] mb-1">
                    <Megaphone size={12} />
                    <span>Communication &amp; Marketing</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                    Diffuseur de Pop-ups avec Image
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Affichez des alertes visuelles, annonces de promotion ou pop-ups riches avec photo à l'ensemble des visiteurs du site.
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF]">
                  <ImageIcon size={20} />
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="annEnabled"
                    checked={annEnabled}
                    onChange={(e) => setAnnEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-[#7B3DFF] focus:ring-[#7B3DFF]"
                  />
                  <label htmlFor="annEnabled" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Activer la pop-up d'annonce sur tout le site TRUST
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Titre de la pop-up"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="ex: Offre Séquestre Spéciale"
                    required={annEnabled}
                  />

                  <Input
                    label="Badge d'accent (texte pill)"
                    value={annBadge}
                    onChange={(e) => setAnnBadge(e.target.value)}
                    placeholder="ex: 100% Sécurisé / Nouveauté"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Message de la pop-up
                  </label>
                  <textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    rows={2}
                    placeholder="Expliquez la nouveauté ou l'annonce..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs text-slate-900 dark:text-[#F4F6FC] focus:ring-2 focus:ring-[#7B3DFF] focus:outline-none"
                    required={annEnabled}
                  />
                </div>

                {/* Image URL & Quick Presets */}
                <div className="space-y-2">
                  <Input
                    label="URL de l'image de bannière (HTTPS)"
                    value={annImage}
                    onChange={(e) => setAnnImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />

                  {/* Preset quick image buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-400">Presets rapides :</span>
                    {[
                      { label: 'FinTech / Sécurité', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80' },
                      { label: 'High-Tech / Crypto', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80' },
                      { label: 'E-commerce / Shopping', url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=80' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAnnImage(p.url)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-[#7B3DFF]/20 hover:text-[#7B3DFF] text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Image live thumbnail preview */}
                  {annImage && (
                    <div className="mt-2 relative w-full h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                      <img src={annImage} alt="Preview" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono">
                        Aperçu réel
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Texte du bouton d'action"
                    value={annActionText}
                    onChange={(e) => setAnnActionText(e.target.value)}
                    placeholder="ex: En savoir plus"
                  />

                  <Input
                    label="Lien de destination du bouton"
                    value={annActionUrl}
                    onChange={(e) => setAnnActionUrl(e.target.value)}
                    placeholder="ex: /escrow/new ou https://..."
                  />
                </div>

                {/* Action buttons bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestToast}
                    className="text-xs gap-1"
                  >
                    <Send size={13} />
                    <span>Tester le Toast</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handlePreviewPopup}
                    className="text-xs gap-1"
                  >
                    <Eye size={13} />
                    <span>Aperçu Pop-up</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="text-xs gap-1 bg-[#7B3DFF] hover:bg-[#682ad4]"
                  >
                    <Check size={14} />
                    <span>Sauvegarder &amp; Diffuser</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ─── MODAL: ARBITRATE DISPUTE (motion-design: animate-modal-enter) ── */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-[#131820] max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-rose-500 uppercase tracking-wider block">
                  Arbitrage officiel — Litige #{selectedDispute.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC] mt-0.5">
                  Verdict Tiers de Confiance TRUST
                </h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2030] text-xs space-y-1.5">
              <p>
                <strong className="text-slate-900 dark:text-white">Objet :</strong> {selectedDispute.paiement_title}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Montant séquestré :</strong>{' '}
                <span className="font-bold text-rose-500">{formatFCFA(selectedDispute.paiement_amount || 0)}</span>
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Plainte formulée par :</strong> @{selectedDispute.opened_by_username}
              </p>
              <p className="text-slate-500 pt-1">
                "{selectedDispute.details}"
              </p>
            </div>

            {/* Arbitration Choice */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Décision de Libération des Fonds
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setArbitrationAction('refund')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    arbitrationAction === 'refund'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Rembourser l'Acheteur</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Non-conformité avérée ou colis non livré
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setArbitrationAction('release')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    arbitrationAction === 'release'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Payer le Vendeur</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Preuve de conformité &amp; livraison fournie
                  </p>
                </button>
              </div>
            </div>

            {/* Motivation / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Motivation juridique &amp; technique (transmise aux deux parties)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Indiquez les éléments de preuve examinés et la justification de la décision..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs text-slate-900 dark:text-[#F4F6FC] focus:ring-2 focus:ring-[#7B3DFF] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDispute(null)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={submittingDispute}
                onClick={handleResolveDispute}
                className="text-xs bg-[#7B3DFF] hover:bg-[#682ad4]"
              >
                Confirmer le Verdict &amp; Débloquer les Fonds
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT KYC ────────────────────────────────────────────── */}
      {showKycRejectModal && selectedKyc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
              Refuser le Dossier KYC de @{selectedKyc.user_username}
            </h3>
            <p className="text-xs text-slate-400">
              Veuillez préciser le motif du rejet afin que l'utilisateur puisse corriger sa soumission.
            </p>

            <textarea
              value={kycRejectionReason}
              onChange={(e) => setKycRejectionReason(e.target.value)}
              placeholder="Ex : Document illisible, date de validité expirée, photo floue..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A2030] text-xs text-slate-900 dark:text-[#F4F6FC] focus:ring-2 focus:ring-[#7B3DFF] focus:outline-none"
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowKycRejectModal(false);
                  setSelectedKyc(null);
                }}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReviewKyc(selectedKyc.id, 'REJECTED', kycRejectionReason)}
                className="text-xs"
              >
                Confirmer le Rejet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
