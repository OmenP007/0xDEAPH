import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState<'client' | 'seller' | 'developer'>('client');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation de la plateforme.');
      return;
    }

    setLoading(true);

    try {
      await register({ username, email, password, password2, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription. Veuillez vérifier les informations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'rgba(123,61,255,0.08)' }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center opacity-0 animate-enter stagger-1" style={{ animationFillMode: 'forwards' }}>
        <Link to="/" className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7B3DFF]/10 flex items-center justify-center p-2">
            <img src="/logo.png" alt="TRUST Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-[#F4F6FC] tracking-tight">
            TRUST
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F4F6FC]">
          Créer votre compte TRUST
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Sécurisez vos transactions dès aujourd'hui avec l'escrow de confiance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 opacity-0 animate-modal-enter" style={{ animationFillMode: 'forwards', animationDelay: '120ms' }}>
        <div className={`bg-white dark:bg-[#131820] py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 animate-enter" style={{ animationFillMode: 'forwards' }}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Input
                label="Nom d'utilisateur"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: moussa_tech"
                required
              />
            </div>

            <div>
              <Input
                label="Adresse Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: moussa@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Type de profil
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    role === 'client'
                      ? 'border-[#7B3DFF] bg-[#7B3DFF]/10 text-[#7B3DFF]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Acheteur / Client
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    role === 'seller'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Vendeur
                </button>
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    role === 'developer'
                      ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Développeur (API)
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {role === 'client' && 'Vous pourrez initier des séquestres protégés en tant qu\'acheteur.'}
                {role === 'seller' && 'Vous pourrez créer des liens Paylink et recevoir des paiements séquestrés.'}
                {role === 'developer' && 'Vous pourrez générer des clés API pour intégrer TRUST.'}
              </p>
            </div>

            <div>
              <Input
                label="Mot de passe"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                required
              />
            </div>

            <div>
              <Input
                label="Confirmer le mot de passe"
                id="password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#7B3DFF] focus:ring-[#7B3DFF]"
              />
              <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                J'accepte les conditions générales d'utilisation et les règles de séquestre de la plateforme TRUST.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-4"
            >
              <span>Créer mon compte</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-[#7B3DFF] hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
