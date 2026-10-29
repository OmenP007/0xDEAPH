import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle,
  FileText,
  Key,
  CreditCard,
  Building2,
  Users,
  ChevronDown,
  Sparkles,
  Zap,
  RefreshCw,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    {
      num: '01',
      title: 'Création & Accord',
      desc: 'L\'acheteur ou le vendeur initie la transaction en précisant le montant, la description et les conditions de livraison.',
      icon: FileText,
    },
    {
      num: '02',
      title: 'Séquestre Sécurisé',
      desc: 'L\'acheteur dépose les fonds sur TRUST. L\'argent est conservé de manière inviolable pendant toute la durée de la prestation.',
      icon: Lock,
    },
    {
      num: '03',
      title: 'Livraison & Code OTP',
      desc: 'Le vendeur expédie ou livre le bien. L\'acheteur vérifie la conformité et transmet son code OTP secret unique pour valider.',
      icon: ShieldCheck,
    },
    {
      num: '04',
      title: 'Déblocage des Fonds',
      desc: 'Dès validation du code de livraison ou du délai convenu, les fonds nets sont immédiatement libérés vers le portefeuille du vendeur.',
      icon: CheckCircle,
    },
  ];

  const faqs = [
    {
      q: 'Comment fonctionne la garantie de séquestre sur TRUST ?',
      a: 'Lorsque vous effectuez un paiement, l\'argent ne va pas directement au vendeur. Il est consigné sur un compte séquestre technique dédié. Le vendeur est notifié que les fonds sont sécurisés et procède à la livraison en toute tranquillité. L\'argent ne lui est transféré qu\'une fois que vous confirmez la bonne réception.',
    },
    {
      q: 'Quel est le rôle du code OTP de livraison ?',
      a: 'Pour les remises en main propre ou livraisons physiques, un code OTP à 6 chiffres est généré exclusivement pour l\'acheteur. Le livreur ou vendeur saisit ce code lors de la remise pour prouver mathématiquement la livraison sans contestation possible.',
    },
    {
      q: 'Quels sont les frais appliqués sur les transactions ?',
      a: 'La commission de service TRUST est transparente et fixe : 1,00% du montant de la transaction, calculée automatiquement lors du séquestre. Aucun frais caché.',
    },
    {
      q: 'Que se passe-t-il en cas de non-conformité ou de litige ?',
      a: 'Si l\'article reçu ne correspond pas à l\'accord, un litige peut être ouvert en 1 clic. Les fonds restent bloqués et notre équipe de médiation intervient pour examiner les preuves et procéder soit à la résolution, soit au remboursement intégral de l\'acheteur.',
    },
    {
      q: 'Comment intégrer TRUST sur ma boutique ou mon application ?',
      a: 'TRUST propose une API REST complète et documentée (format OpenAPI/Swagger), des webhooks temps réel et un système de génération de clés d\'API avec scopes de permissions pour les développeurs.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F14] text-slate-900 dark:text-[#F4F6FC] transition-colors selection:bg-[#7B3DFF]/30">
      {/* ─── PUBLIC NAVBAR ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/85 dark:bg-[#0B0F14]/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-[#7B3DFF]/10 flex items-center justify-center p-1">
              <img src="/logo.png" alt="TRUST Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#F4F6FC] flex items-center gap-1.5">
                TRUST
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] border border-[#7B3DFF]/20">
                  ESCROW
                </span>
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#how-it-works" className="hover:text-[#7B3DFF] transition-colors">Fonctionnement</a>
            <a href="#advantages" className="hover:text-[#7B3DFF] transition-colors">Avantages</a>
            <a href="#solutions" className="hover:text-[#7B3DFF] transition-colors">Solutions</a>
            <a href="#developers" className="hover:text-[#7B3DFF] transition-colors">Développeurs</a>
            <a href="#faq" className="hover:text-[#7B3DFF] transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              title={resolvedTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Connexion
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
              Créer un compte
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ──────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#7B3DFF]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[200px] bg-[#00E5FF]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] text-slate-900 dark:text-[#F4F6FC] opacity-0 animate-enter stagger-1" style={{ animationFillMode: 'forwards' }}>
            Avec{' '}
            <span className="bg-gradient-to-r from-[#7B3DFF] via-[#00E5FF] to-[#9e6bfa] bg-clip-text text-transparent animate-text-shimmer">
              Trust
            </span>
            , vos transactions{' '}
            <span className="bg-gradient-to-r from-[#7B3DFF] via-[#9e6bfa] to-[#00E5FF] bg-clip-text text-transparent">
              en toute confiance.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            TRUST sécurise chaque échange entre acheteurs et vendeurs. Les fonds sont conservés en séquestre inviolable et ne sont débloqués qu'après validation conforme de la livraison.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto text-base px-8 h-12 shadow-[0_8px_24px_rgba(123,61,255,0.3)]"
            >
              <span>Créer un compte sécurisé</span>
              <ArrowRight size={18} className="ml-1" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto text-base px-8 h-12"
            >
              Découvrir comment ça marche
            </Button>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-16 pt-10 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">1,00 %</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Frais fixes & transparents</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#7B3DFF]">Code OTP</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Validation physique infalsifiable</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#00E5FF]">3 Jours</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Délai d'auto-libération garanti</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500">100 %</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fonds séquestrés protégés</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-[#0E131C] border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#7B3DFF] uppercase tracking-wider">
              Processus Étape par Étape
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F4F6FC] mt-2">
              Comment fonctionne l'escrow TRUST ?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm sm:text-base">
              Un cycle de transaction transparent, sans intermédiaire opaque, guidé par des règles contractuelles strictes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st) => (
              <div
                key={st.num}
                className="relative rounded-2xl p-6 bg-slate-50 dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80 hover:border-[#7B3DFF]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7B3DFF]/10 text-[#7B3DFF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <st.icon size={22} />
                  </div>
                  <span className="text-2xl font-black text-slate-300 dark:text-slate-700">
                    {st.num}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F4F6FC]">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ADVANTAGES SECTION ────────────────────────────────────────── */}
      <section id="advantages" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#00E5FF] uppercase tracking-wider">
              Avantages Clés
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F4F6FC] mt-2">
              Construit pour la rigueur FinTech
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-[#7B3DFF] flex items-center justify-center mb-6">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F4F6FC]">
                Sécurité & Séquestre Inviolable
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Les montants sont isolés dans des coffres numériques. Aucun vendeur ne peut encaisser prématurément, et aucun acheteur ne peut récupérer ses fonds sans motif légitime.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F4F6FC]">
                Transparence Totale
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Chaque étape est enregistrée avec horodatage immuable. Les deux parties voient exactement l'état de l'escrow : Bloqué, Livraison en cours, ou Libéré.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F4F6FC]">
                Auto-Release & Médiation
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Un mécanisme automatisé débloque les fonds après le délai de carence si aucune contestation n'est formulée, assurant aux vendeurs d'être toujours payés.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOLUTIONS FOR BUSINESS & INDIVIDUALS ───────────────────────── */}
      <section id="solutions" className="py-24 bg-white dark:bg-[#0E131C] border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80">
              <div className="inline-flex p-3 rounded-2xl bg-[#7B3DFF]/10 text-[#7B3DFF] mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F6FC]">
                Pour les Particuliers & Freelances
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm leading-relaxed">
                Achetez du matériel d'occasion, réglez une prestation de développement, de design ou commandez des articles sans jamais risquer de perdre votre avance.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Génération de liens Paylink pour se faire payer
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Code OTP secret remis uniquement lors de la réception
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Remboursement garanti si l'article n'est pas envoyé
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-[#131820] border border-slate-200/80 dark:border-slate-800/80">
              <div className="inline-flex p-3 rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF] mb-6">
                <Building2 size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F6FC]">
                Pour les Entreprises & E-commerçants
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm leading-relaxed">
                Augmentez votre taux de conversion en offrant à vos clients la garantie qu'ils ne paient qu'à la réception. Zéro chargeback abusif pour les marchands.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Intégration API e-commerce en quelques lignes de code
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Conformité KYC et facturation normalisée
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  Gestion de volumes et webhooks en temps réel
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DEVELOPERS API SECTION ────────────────────────────────────── */}
      <section id="developers" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#131820] to-[#0A0E15] border border-slate-800 p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold mb-4">
                  <Key size={14} />
                  <span>API Développeurs & Webhooks</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Intégrez l'escrow TRUST en 10 minutes
                </h2>
                <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                  Clés d'API avec scopes granulaires (<code className="text-[#00E5FF]">read</code>, <code className="text-[#00E5FF]">write</code>, <code className="text-[#00E5FF]">payments</code>). Webhooks cryptographiquement vérifiés pour automatiser vos livraisons.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button variant="accent" onClick={() => navigate('/api-keys')}>
                    Obtenir une clé API
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => window.open('http://localhost:8000/api/schema/swagger/', '_blank')}>
                    Documentation Swagger <ExternalLink size={14} className="ml-1" />
                  </Button>
                </div>
              </div>

              {/* Code snippet mock */}
              <div className="bg-[#06080D] rounded-2xl p-5 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto shadow-2xl">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-500 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400">POST /api/payments/</span>
                </div>
                <pre className="text-slate-300">
{`// Créer une transaction de séquestre
const response = await fetch("https://api.trust.sn/api/payments/", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tr_live_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amount: 1450000,
    seller_username: "moussa_store",
    item_title: "MacBook Pro 16 M2 Max",
    delivery_terms: "Remise en main propre contre OTP"
  })
});
const escrow = await response.json();
console.log(escrow.reference, escrow.status); // TR-98214-XOF, BLOCKED`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ───────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white dark:bg-[#0E131C] border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-[#7B3DFF] uppercase tracking-wider">
              Foire Aux Questions
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-[#F4F6FC] mt-2">
              Questions Fréquentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131820]/60 p-5 cursor-pointer transition-all hover:border-[#7B3DFF]/30"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FC]">
                    {faq.q}
                  </h3>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#7B3DFF]' : ''}`}
                  />
                </div>
                {openFaq === idx && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="py-12 bg-slate-100 dark:bg-[#070A0F] border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TRUST" className="w-6 h-6 object-contain" />
            <span className="font-bold text-slate-900 dark:text-white">TRUST Escrow</span>
            <span>—</span>
            <span>Trust every transaction.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Conditions Générales</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Politique de Confidentialité</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Documentation API</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
