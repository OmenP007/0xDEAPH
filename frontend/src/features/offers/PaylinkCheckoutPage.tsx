import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { formatFCFA, formatDate } from '@/lib/utils';
import { MOCK_OFFERS } from '@/lib/mock-data';
import { Offer } from '@/types/escrow';

export const PaylinkCheckoutPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      setLoading(true);
      try {
        const res = await api.getOffer(code!);
        setOffer(res);
      } catch {
        const found = MOCK_OFFERS.find((o) => o.code === code);
        setOffer(found || MOCK_OFFERS[0]);
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [code]);

  const handleCheckout = async () => {
    setError(null);
    setCheckingOut(true);
    try {
      // In demo mode or if API is running
      setTimeout(() => {
        navigate('/escrow/101');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Impossible de finaliser le paiement.');
      setCheckingOut(false);
    }
  };

  if (loading || !offer) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F14] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-[#7B3DFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F14] text-slate-900 dark:text-[#F4F6FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src="/logo.png" alt="TRUST Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black tracking-tight">TRUST ESCROW</span>
          </div>
          <p className="text-xs text-slate-400">Paiement Sécurisé Garanti par Séquestre</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Checkout Card */}
        <Card className="p-6 sm:p-8 space-y-6 border-slate-200/80 dark:border-slate-800/80 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Offre Commerciale
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {offer.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vendeur vérifié : <strong className="text-slate-700 dark:text-slate-300">@{offer.seller_username}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-[#7B3DFF] dark:text-[#a277ff]">
                {formatFCFA(offer.amount)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2030] text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-slate-900 dark:text-white">Description de l'article :</p>
            <p>{offer.description}</p>
            {offer.delivery_terms && (
              <p className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                <strong>Conditions :</strong> {offer.delivery_terms}
              </p>
            )}
          </div>

          {/* Guarantee info */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck size={16} />
              <span>Garantie Séquestre TRUST</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Votre argent est conservé sous séquestre. Le vendeur ne sera payé que lorsque vous lui transmettrez votre code secret OTP lors de la livraison.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            isLoading={checkingOut}
            onClick={handleCheckout}
            className="w-full gap-2 shadow-[0_4px_16px_rgba(123,61,255,0.3)]"
          >
            <Lock size={16} />
            <span>Séquestrer {formatFCFA(offer.amount)}</span>
            <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
    </div>
  );
};
