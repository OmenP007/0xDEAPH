import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { MOCK_OFFERS } from '@/lib/mock-data';
import { Offer } from '@/types/escrow';

export const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDemoMode } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Paylink Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(50000);
  const [deliveryTerms, setDeliveryTerms] = useState('Remise en main propre ou envoi express');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          setOffers(MOCK_OFFERS);
        } else {
          const res = await api.getOffers();
          setOffers(res.length > 0 ? res : MOCK_OFFERS);
        }
      } catch {
        setOffers(MOCK_OFFERS);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [isDemoMode]);

  const handleCopy = (code: string) => {
    const fullUrl = `${window.location.origin}/pay/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (isDemoMode) {
        const newOffer: Offer = {
          id: Date.now(),
          code: `OFF-${Math.random().toString(36).substring(2, 6).toUpperCase()}-9X2B`,
          title,
          description,
          amount,
          currency: 'XOF',
          delivery_terms: deliveryTerms,
          is_active: true,
          seller_username: 'vous',
          created_at: new Date().toISOString(),
        };
        setOffers([newOffer, ...offers]);
        setShowModal(false);
        setCreating(false);
        return;
      }

      const res = await api.createOffer({
        title,
        description,
        amount,
        delivery_terms: deliveryTerms,
      });

      setOffers([res, ...offers]);
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du lien.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
          className="text-xs"
        >
          <PlusCircle size={14} />
          Créer un Lien Paylink
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <Card key={offer.id} className="p-6 space-y-4 hover:border-[#7B3DFF]/40 transition-all">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131820] max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
              Créer un Nouveau Lien de Vente Séquestré
            </h3>

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

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={creating}>
                  Générer le lien Paylink
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
