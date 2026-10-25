import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { formatFCFA, calculateFees } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export const NewEscrowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();

  // Wizard state (steps 1 to 5)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [sellerUsername, setSellerUsername] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [amount, setAmount] = useState<number>(150000);
  const [deliveryTerms, setDeliveryTerms] = useState(
    'Remise en main propre contre code de validation OTP à 6 chiffres'
  );
  const [autoReleaseDays, setAutoReleaseDays] = useState(3);

  const { fee, net } = calculateFees(amount || 0);

  const handleNext = () => {
    setError(null);
    if (step === 1 && !sellerUsername.trim()) {
      setError('Veuillez renseigner le nom d\'utilisateur du vendeur.');
      return;
    }
    if (step === 2 && (!amount || amount <= 0)) {
      setError('Le montant doit être supérieur à 0 FCFA.');
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
      if (isDemoMode) {
        // Simulated creation in demo mode
        setTimeout(() => {
          navigate('/escrow/101');
        }, 800);
        return;
      }

      const res = await api.createPayment({
        amount,
        seller_username: sellerUsername,
        item_title: itemTitle,
        item_description: itemDescription,
        delivery_terms: deliveryTerms,
      });

      navigate(`/escrow/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du séquestre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-4">
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
          <div className="space-y-6">
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
          <div className="space-y-6">
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
                min="100"
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
                  <span className="text-slate-400">Frais de séquestre TRUST (1,00%) :</span>
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
          <div className="space-y-6">
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
          <div className="space-y-6">
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

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Conditions de validation</span>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {deliveryTerms}
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
