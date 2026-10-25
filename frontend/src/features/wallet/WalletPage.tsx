import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building,
  Smartphone,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatFCFA, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(1450000);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState(50000);
  const [method, setMethod] = useState<'wave' | 'orange' | 'card'>('wave');
  const [processing, setProcessing] = useState(false);

  const transactions = [
    { id: 1, type: 'IN', title: 'Déblocage Séquestre MacBook', date: '24 Oct 2026', amount: 594000 },
    { id: 2, type: 'OUT', title: 'Mise en Séquestre Samsung A54', date: '23 Oct 2026', amount: -875000 },
    { id: 3, type: 'IN', title: 'Rechargement Wave Mobile Money', date: '21 Oct 2026', amount: 300000 },
    { id: 4, type: 'OUT', title: 'Retrait vers Compte Bancaire BOA', date: '19 Oct 2026', amount: -450000 },
  ];

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setBalance(balance + amount);
      setProcessing(false);
      setShowTopup(false);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
          Portefeuille & Soldes
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gérez vos fonds disponibles, approvisionnez votre solde et effectuez des retraits.
        </p>
      </div>

      {/* Main Balance Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-[#131820] to-[#0A0E15] text-white border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Solde Actuel Disponible
            </span>
            <p className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {formatFCFA(balance)}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#00E5FF]" />
              Compte vérifié et garanti
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowTopup(true)}
              className="text-xs gap-1.5"
            >
              <ArrowDownLeft size={14} />
              Approvisionner
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-700 text-slate-300 hover:text-white"
              onClick={() => alert('Demande de retrait initiée vers votre compte enregistré.')}
            >
              <ArrowUpRight size={14} />
              Demander un Retrait
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Mouvements de Fonds Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {transactions.map((t) => (
              <div key={t.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'IN'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {t.type === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-[#F4F6FC]">{t.title}</p>
                    <span className="text-[10px] text-slate-400">{t.date}</span>
                  </div>
                </div>

                <span
                  className={`font-bold text-sm ${
                    t.type === 'IN' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {t.amount > 0 ? `+${formatFCFA(t.amount)}` : formatFCFA(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topup Modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131820] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Approvisionner votre Solde TRUST
            </h3>

            <form onSubmit={handleTopup} className="space-y-4">
              <Input
                label="Montant à créditer (FCFA)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1000"
                step="5000"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mode de paiement
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setMethod('wave')}
                    className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 ${
                      method === 'wave'
                        ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone size={16} />
                    Wave
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('orange')}
                    className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 ${
                      method === 'orange'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone size={16} />
                    Orange Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 ${
                      method === 'card'
                        ? 'border-[#7B3DFF] bg-[#7B3DFF]/10 text-[#7B3DFF]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CreditCard size={16} />
                    Carte
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowTopup(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={processing}>
                  Confirmer le Rechargement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
