import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate(next);
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects. Veuillez réessayer.');
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
          Connexion à votre espace
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Accédez à vos séquestres et suivez vos transactions en direct
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Input
                label="Nom d'utilisateur ou Email"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: abdoul_diallo"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                <a href="#" className="text-xs font-medium text-[#7B3DFF] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2030] px-3.5 py-2 pr-10 text-sm text-slate-900 dark:text-[#F4F6FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3DFF]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              <span>Se connecter</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Vous n'avez pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-[#7B3DFF] hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
