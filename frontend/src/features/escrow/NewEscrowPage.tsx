import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Lock,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatFCFA } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getPlatformSettings, loadPlatformSettings } from '@/lib/platform-settings';
import { canCreateEscrow } from '@/lib/roles';

export const NewEscrowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard state (steps 1 to 5)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [sellerUsername, setSellerUsername] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [amount, setAmount] = useState<number>(150000);
  const [deliveryTerms, setDeliveryTerms] = useState(
    'Remise en main propre contre code de validation OTP à 6 chiffres'
  );
  const [autoReleaseDays, setAutoReleaseDays] = useState(() => getPlatformSettings().autoReleaseDelayDays);
  const [platformSettings, setPlatformSettings] = useState(() => getPlatformSettings());

  useEffect(() => {
    loadPlatformSettings()
      .then((settings) => {
        setPlatformSettings(settings);
        setAutoReleaseDays(settings.autoReleaseDelayDays);
      })
      .catch(() => {
        // Keep cached/default configuration when the API is unreachable.
      });
  }, []);

  const commissionRate = Number(platformSettings.commissionRatePercent);
  const fee = Math.round((amount || 0) * (commissionRate / 100));
  const net = (amount || 0) - fee;
  const minAmount = Number(platformSettings.minEscrowAmount || 500);

  const handleNext = () => {
    setError(null);
    if (step === 1 && !sellerUsername.trim()) {
      setError('Veuillez renseigner le nom d\'utilisateur du vendeur.');
      return;
    }
    if (step === 1 && user && sellerUsername.trim().toLowerCase() === user.username.toLowerCase()) {
      setError('Vous ne pouvez pas être à la fois acheteur et vendeur pour la même transaction.');
      return;
    }
    if (step === 2 && (!amount || amount < minAmount)) {
      setError(`Le montant minimum pour un séquestre est de ${formatFCFA(minAmount)}.`);
      return;
    }
    if (step === 3 && !itemTitle.trim()) {
      setError('Veuillez renseigner le titre du bien ou de la prestation.');
      return;
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const fullDescription = [
        itemDescription,
        deliveryTerms ? `[Modalités de livraison]: ${deliveryTerms}` : '',
        itemImageUrl ? `[Visuel]: ${itemImageUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await api.createPayment({
        amount,
        seller_username: sellerUsername,
        item_title: itemTitle,
        item_description: fullDescription,
        delivery_terms: deliveryTerms,
      });

      if (res.checkout_url && res.status === 'CREATED') {
        // Redirige l'acheteur vers la page de paiement sécurisée GeniusPay / Mobile Money
        window.location.href = res.checkout_url;
      } else {
        navigate(`/escrow/${res.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du séquestre.');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateEscrow(user)) {
    return (
      <div className="max-w-3xl mx-auto py-8 animate-page-enter">
        <Card className="p-8 text-center space-y-3">
          <ShieldCheck size={32} className="mx-auto text-[#7B3DFF]" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Le séquestre direct est réservé aux comptes client
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Votre compte ({user?.role || 'membre'}) ne peut pas initier un paiement séquestré.
            En tant que vendeur ou membre, créez plutôt un lien Paylink que vos acheteurs régleront.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              to="/offers"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7B3DFF] text-white text-xs font-bold hover:bg-[#682ad4]"
            >
              Gérer mes Paylinks
            </Link>
            <Link
              to="/escrow"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Voir mes séquestres
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-page-enter py-4">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F4F6FC]">
          Créer un Nouveau Séquestre Sécurisé
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Les fonds seront consignés sur TRUST et ne seront libérés au vendeur qu'après vérification conforme de la livraison.
        </p>
      </div>

      {/* Progress Steps Indicator */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
        {[
          { num: 1, label: 'Contrepartie' },
          { num: 2, label: 'Montant' },
          { num: 3, label: 'Objet & Modalités' },
          { num: 4, label: 'Récapitulatif' },
        ].map((s) => (
          <div key={s.num} className="relative z-10 flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s.num
                  ? 'bg-[#7B3DFF] text-white shadow-[0_2px_8px_rgba(123,61,255,0.4)]'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {step > s.num ? <CheckCircle size={16} /> : s.num}
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 hidden sm:block">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <Card className="p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-6 animate-enter">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                Étape 1 : Qui est le vendeur ?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Indiquez le nom d'utilisateur du vendeur ou marchand sur la plateforme TRUST.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nom d'utilisateur du Vendeur"
                value={sellerUsername}
                onChange={(e) => setSellerUsername(e.target.value)}
                placeholder="ex: moussa_store"
                required
              />

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Rôle de l'acheteur (Vous) :
                </p>
                <p>
                  Vous consignez les fonds. Un code secret OTP de livraison vous sera délivré pour sécuriser la remise.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-enter">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                Étape 2 : Montant de la transaction
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Définissez la valeur du bien ou de la prestation en Francs CFA (XOF).
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Montant Total de la Transaction (FCFA)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={minAmount}
                step="1000"
                required
              />

              {/* Commission breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant consigné :</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatFCFA(amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frais de séquestre TRUST ({commissionRate.toFixed(2).replace('.', ',')}%) :</span>
                  <span className="font-semibold text-[#7B3DFF]">
                    {formatFCFA(fee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                  <span className="text-slate-900 dark:text-white">Montant net versé au vendeur :</span>
                  <span className="text-emerald-500">
                    {formatFCFA(net)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-enter">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                Étape 3 : Objet et Conditions de livraison
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Décrivez précisément ce qui a été convenu entre vous et le vendeur.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Titre de l'objet ou de la prestation"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="ex: Ordinateur portable Dell XPS 15 32Go"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description détaillée & Clauses
                </label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={3}
                  placeholder="État du matériel, accessoires inclus, garantie, etc."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] p-3 text-sm text-slate-900 dark:text-[#F4F6FC] focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
                />
              </div>

              <div className="space-y-2">
                <Input
                  label="Photo ou Image de l'article (Optionnelle)"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... ou lien de l'image"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400">Exemples rapides :</span>
                  {[
                    { label: 'MacBook / PC', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80' },
                    { label: 'iPhone / Tel', url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80' },
                    { label: 'Montre / Luxe', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80' },
                    { label: 'Prestation Dev', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setItemImageUrl(preset.url)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-[#7B3DFF]/20 hover:text-[#7B3DFF] text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {itemImageUrl && (
                  <div className="mt-2 relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <img src={itemImageUrl} alt="Aperçu article" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono">
                      Photo attachée au séquestre
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Modalités de livraison et validation
                </label>
                <textarea
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] p-3 text-sm text-slate-900 dark:text-[#F4F6FC] focus:outline-none focus:ring-2 focus:ring-[#7B3DFF]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-enter">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                Étape 4 : Vérification du Récapitulatif
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Vérifiez chaque point contractuel avant de bloquer les fonds en séquestre.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-800/80 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">Vendeur désigné</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    @{sellerUsername || 'moussa_store'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Montant à séquestrer</span>
                  <span className="font-bold text-[#7B3DFF] text-base">
                    {formatFCFA(amount)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Objet</span>
                <span className="font-semibold text-slate-900 dark:text-[#F4F6FC]">
                  {itemTitle || 'Non renseigné'}
                </span>
                {itemDescription && (
                  <p className="text-slate-500 mt-1">{itemDescription}</p>
                )}
              </div>

              {itemImageUrl && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={itemImageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Visuel contractuel</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">Photo enregistrée dans le séquestre</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Conditions de validation &amp; Auto-Libération</span>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {deliveryTerms}
                </p>
                <p className="text-[11px] text-[#7B3DFF] dark:text-[#a277ff] mt-1 font-semibold flex items-center gap-1">
                  <Clock size={12} />
                  Délai légal de protection : {autoReleaseDays} jour{autoReleaseDays > 1 ? 's' : ''} avant auto-libération.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-emerald-500 font-medium">
                <ShieldCheck size={16} />
                <span>Protection TRUST : Séquestre garanti jusqu'à remise du code OTP.</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
              <ArrowLeft size={14} />
              Précédent
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button variant="primary" size="sm" onClick={handleNext} className="gap-1">
              Continuer
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              isLoading={loading}
              onClick={handleSubmit}
              className="gap-2 shadow-[0_4px_16px_rgba(123,61,255,0.3)]"
            >
              <Lock size={16} />
              Confirmer et Séquestrer les Fonds
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
