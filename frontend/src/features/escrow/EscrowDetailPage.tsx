import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lock,
  KeyRound,
  FileText,
  User,
  ArrowLeft,
  Share2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate, getRemainingTime } from '@/lib/utils';
import { EscrowTransaction } from '@/types/escrow';

export const EscrowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingOtp, setSubmittingOtp] = useState(false);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Article non conforme ou défectueux');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => {
    const fetchEscrow = async () => {
      setLoading(true);
      try {
        const res = await api.getPayment(id!);
        setEscrow(res);
      } catch (err: any) {
        setActionError(err.message || 'Impossible de charger la transaction.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEscrow();
  }, [id]);

  if (loading || !escrow) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4 animate-enter">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-xl skeleton" />
          <div className="h-8 w-28 rounded-xl skeleton" />
        </div>
        <div className="h-44 rounded-3xl skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-36 rounded-3xl skeleton" />
          <div className="h-36 rounded-3xl skeleton" />
        </div>
      </div>
    );
  }

  const isBuyer = escrow.role_current_user === 'buyer';
  const remaining = getRemainingTime(escrow.auto_release_at);

  const handleConfirmOtp = async () => {
    setActionError(null);
    setSubmittingOtp(true);
    try {
      await api.confirmDelivery(escrow.id, otpInput);
      setEscrow({ ...escrow, status: 'RELEASED' });
      setOtpSuccess(true);
    } catch (err: any) {
      setActionError(err.message || 'Code OTP invalide. Veuillez vérifier auprès de l\'acheteur.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  const handleOpenDispute = async () => {
    setDisputeLoading(true);
    try {
      await api.openDispute(escrow.id, disputeReason, disputeDetails);
      setEscrow({ ...escrow, status: 'DISPUTED', dispute_reason: disputeReason });
      setShowDisputeModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Impossible d\'ouvrir le litige.');
    } finally {
      setDisputeLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Timeline Steps
  const timelineSteps = [
    { title: 'Accord créé', done: true, date: formatDate(escrow.created_at) },
    { title: 'Fonds Séquestrés', done: escrow.status !== 'CREATED', active: escrow.status === 'BLOCKED', date: formatDate(escrow.blocked_at || escrow.created_at) },
    { title: 'Livraison & Code OTP', done: escrow.status === 'RELEASED', active: escrow.status === 'BLOCKED' },
    { title: 'Fonds Libérés', done: escrow.status === 'RELEASED', active: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter py-2">
      {/* Top back button & Reference */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux transactions
        </button>

        <div className="flex items-center gap-2">
          <Badge status={escrow.status} />
        </div>
      </div>

      {/* Main Title Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">
                {escrow.reference || `TR-${escrow.id}`}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {isBuyer ? 'Vous êtes Acheteur' : 'Vous êtes Vendeur'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F4F6FC] mt-1">
              {escrow.item_title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Initié le {formatDate(escrow.created_at)}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 block">Montant en Séquestre</span>
            <span className="text-2xl sm:text-3xl font-black text-[#7B3DFF] dark:text-[#a277ff]">
              {formatFCFA(escrow.amount)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Net vendeur : {formatFCFA(escrow.net_amount || escrow.amount * 0.99)} (frais 1%: {formatFCFA(escrow.fee_amount || escrow.amount * 0.01)})
            </span>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {timelineSteps.map((st, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    st.done
                      ? 'bg-emerald-500 text-white'
                      : st.active
                      ? 'bg-[#7B3DFF] text-white ring-4 ring-[#7B3DFF]/20 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {st.done ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-xs font-bold mt-2 text-slate-800 dark:text-slate-200">
                  {st.title}
                </span>
                {st.date && (
                  <span className="text-[10px] text-slate-400 mt-0.5">{st.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* OTP Delivery Success Alert */}
      {otpSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-success">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-bold">Code OTP validé avec succès !</p>
            <p className="text-xs text-slate-400">Les fonds ont été libérés instantanément et transférés sur le solde du vendeur.</p>
          </div>
        </div>
      )}

      {/* Action Error Alert */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* OTP Delivery Confirmation Box */}
      {escrow.status === 'BLOCKED' && (
        <Card className="border-[#7B3DFF]/40 bg-gradient-to-br from-white dark:from-[#131820] to-[#7B3DFF]/5 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center shrink-0">
              <KeyRound size={24} />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F6FC]">
                Validation Sécurisée de la Livraison (Code OTP)
              </h3>

              {isBuyer ? (
                /* BUYER VIEW: Reveal the secret OTP code */
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Voici votre code secret de livraison. <strong>Ne le donnez au vendeur ou au livreur qu'une fois le colis inspecté et conforme.</strong>
                  </p>

                  <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-[#0B0F14] border border-slate-800 text-white font-mono text-xl tracking-[0.25em] font-black">
                    {escrow.delivery_otp ? (
                      <>
                        <span className="text-[#00E5FF]">{escrow.delivery_otp}</span>
                        <button
                          onClick={() => copyToClipboard(escrow.delivery_otp || '')}
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          title="Copier le code OTP"
                        >
                          {copiedOtp ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                      </>
                    ) : (
                      <span className="text-amber-400 text-xs font-normal tracking-normal">
                        Code OTP non disponible. Contactez le support.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* SELLER VIEW: Input to confirm OTP received from buyer */
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Demandez le code secret à 6 chiffres à l'acheteur lors de la remise pour déclencher le paiement immédiat :
                  </p>

                  <div className="flex items-center gap-3 max-w-sm">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-36 text-center tracking-[0.25em] font-mono text-lg h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] focus:ring-2 focus:ring-[#7B3DFF] focus:outline-none"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={submittingOtp}
                      onClick={handleConfirmOtp}
                      disabled={otpInput.length < 6}
                    >
                      Valider la livraison
                    </Button>
                  </div>
                </div>
              )}

              {/* Auto Release Timer */}
              {escrow.auto_release_at && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-amber-500">
                  <Clock size={14} />
                  <span>
                    Auto-déblocage garanti dans : <strong>{remaining.formatted}</strong> si aucun litige n'est signalé.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Escrow Details & Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Parties Contractantes
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A2030] text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Acheteur</span>
              <span className="font-bold text-slate-900 dark:text-white">
                @{escrow.buyer_username || 'acheteur'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
              Consignataire
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A2030] text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Vendeur / Bénéficiaire</span>
              <span className="font-bold text-slate-900 dark:text-white">
                @{escrow.seller_username || 'vendeur'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
              Destinataire des fonds
            </span>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Conditions & Spécifications
          </h3>

          <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
            <p>
              <strong className="text-slate-900 dark:text-white">Description :</strong>{' '}
              {escrow.item_description || 'Conforme à l\'accord initial.'}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Modalités :</strong>{' '}
              {escrow.delivery_terms || 'Remise en main propre contre code OTP.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom Dispute / Support Bar */}
      {escrow.status === 'BLOCKED' && (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Un problème avec la livraison ou l'objet reçu ? Ouvrez une médiation avant expiration du délai.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDisputeModal(true)}
            className="text-xs shrink-0"
          >
            Déclarer un litige
          </Button>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-modal-enter">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
              Déclarer un Litige sur cette transaction
            </h3>
            <p className="text-xs text-slate-400">
              Les fonds resteront bloqués. Un médiateur TRUST examinera vos éléments et contactera le vendeur.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Motif principal
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] text-xs text-slate-900 dark:text-white"
              >
                <option value="Article non conforme ou défectueux">Article non conforme ou défectueux</option>
                <option value="Colis jamais reçu / transporteur en défaut">Colis jamais reçu / transporteur en défaut</option>
                <option value="Prestation incomplète ou non livrée">Prestation incomplète ou non livrée</option>
                <option value="Tentative de fraude suspectée">Tentative de fraude suspectée</option>
              </select>

              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Détails et explications
              </label>
              <textarea
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
                rows={3}
                placeholder="Expliquez ce qui s'est passé..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] p-3 text-xs text-slate-900 dark:text-[#F4F6FC]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowDisputeModal(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={disputeLoading}
                onClick={handleOpenDispute}
              >
                Confirmer le Litige
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
