import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Link as LinkIcon,
  PlusCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  QrCode,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { Offer } from '@/types/escrow';
import { useAuth } from '@/context/AuthContext';
import { canCreateOffer } from '@/lib/roles';

export const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = canCreateOffer(user);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedQrOffer, setSelectedQrOffer] = useState<Offer | null>(null);

  // New Paylink Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [amount, setAmount] = useState<number>(50000);
  const [deliveryTerms, setDeliveryTerms] = useState('Remise en main propre ou envoi express');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      try {
        const res = await api.getOffers();
        setOffers(Array.isArray(res) ? res : []);
      } catch {
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleCopy = (code: string) => {
    const fullUrl = `${window.location.origin}/pay/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await api.createOffer({
        title,
        description,
        amount,
        delivery_terms: deliveryTerms,
      });

      setOffers([res, ...offers]);
      setShowModal(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création du lien.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
            Liens de Paiement (Paylinks)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Générez des liens de vente partageables. L'acheteur paie en séquestre en 1 clic.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={!canCreate}
          className="text-xs"
          title={!canCreate ? 'Réservé aux vendeurs et membres' : undefined}
        >
          <PlusCircle size={14} />
          Créer un Lien Paylink
        </Button>
      </div>

      {!canCreate && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
          Votre compte « {user?.role || 'membre'} » ne peut pas créer de Paylink. Les liens de
          paiement sont réservés aux vendeurs, membres et administrateurs. Vous pouvez toujours
          régler un lien reçu en ouvrant son URL <code>/pay/CODE</code>.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer, idx) => (
          <Card
            key={offer.id}
            className="p-6 space-y-4 hover:border-[#7B3DFF]/40 transition-all opacity-0 animate-enter"
            style={{
              animationFillMode: 'forwards',
              animationDelay: `${idx * 80}ms`,
            } as React.CSSProperties}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#7B3DFF] px-2 py-0.5 rounded bg-[#7B3DFF]/10">
                  {offer.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC] mt-2">
                  {offer.title}
                </h3>
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {formatFCFA(offer.amount)}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {offer.description}
            </p>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <LinkIcon size={14} />
                <span>/pay/{offer.code}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQrOffer(offer)}
                  className="text-xs h-8 px-2.5 gap-1"
                  title="Afficher le QR Code de paiement"
                >
                  <QrCode size={14} className="text-[#00E5FF]" />
                  <span className="hidden sm:inline">QR Code</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(offer.code)}
                  className="text-xs h-8 px-2.5 gap-1.5"
                >
                  {copiedCode === offer.code ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copier le lien</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/pay/${offer.code}`)}
                  className="text-xs h-8 px-2.5"
                  title="Aperçu client"
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal create paylink */}
      {showModal && (
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative bg-white dark:bg-[#131820] max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-modal-enter my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                    Créer un Nouveau Lien de Vente Séquestré
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    L'acheteur paiera les fonds sous séquestre sécurisé.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0 hidden" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateOffer} className="space-y-4">
                <Input
                  label="Titre de l'offre"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Pack 3 Séances de Coaching Dev"
                  required
                />

                <Input
                  label="Prix de vente (FCFA)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="500"
                  step="500"
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Description détaillée
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Ce qui est inclus, modalités..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] p-3 text-xs text-slate-900 dark:text-[#F4F6FC] focus:ring-2 focus:ring-[#7B3DFF] focus:outline-none"
                    required
                  />
                </div>

                <Input
                  label="Modalités de livraison / remise"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="ex: Envoi par coursier ou validation visio"
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowModal(false)}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" type="submit" isLoading={creating}>
                    Générer le lien Paylink
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      )}

      {/* ─── MODAL: QR CODE PAIEMENT MOBILE MONEY ─── */}
      {selectedQrOffer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-[#131820] max-w-sm w-full rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl text-center animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                QR Code Séquestre
              </span>
              <button
                onClick={() => setSelectedQrOffer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedQrOffer.title}
              </h3>
              <p className="text-xl font-black text-[#7B3DFF] dark:text-[#a277ff] mt-1">
                {formatFCFA(selectedQrOffer.amount)}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block mx-auto border-4 border-slate-100 dark:border-slate-700">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(
                  `${window.location.origin}/pay/${selectedQrOffer.code}`
                )}`}
                alt="QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Faites scanner ce QR Code à votre acheteur pour ouvrir directement le paiement sécurisé Wave ou Orange Money.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCopy(selectedQrOffer.code)}
                className="w-full text-xs gap-1.5"
              >
                <Copy size={13} />
                <span>Copier l'URL Paylink</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
