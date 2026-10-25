import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  Bell,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  LogOut,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onOpenMobileNav: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileNav }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { user, isDemoMode, toggleDemoMode, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Map path to title and breadcrumb
  const getPageMeta = (pathname: string) => {
    if (pathname.startsWith('/escrow/new')) {
      return { title: 'Créer un Séquestre Sécurisé', breadcrumb: 'Escrow > Nouveau' };
    }
    if (pathname.startsWith('/escrow/')) {
      return { title: 'Détail de la Transaction', breadcrumb: 'Escrow > Suivi' };
    }
    switch (pathname) {
      case '/dashboard':
        return { title: 'Tableau de bord', breadcrumb: 'Accueil > Synthèse' };
      case '/transactions':
        return { title: 'Historique des Transactions', breadcrumb: 'Transactions > Liste' };
      case '/escrow':
        return { title: 'Gestion des Séquestres', breadcrumb: 'Escrow > Vue d\'ensemble' };
      case '/offers':
        return { title: 'Liens de Paiement (Paylinks)', breadcrumb: 'Vente > Liens de paiement' };
      case '/wallet':
        return { title: 'Portefeuille & Soldes', breadcrumb: 'Finance > Portefeuille' };
      case '/api-keys':
        return { title: 'Clés d\'API & Développeurs', breadcrumb: 'Développeur > Intégration' };
      case '/security':
        return { title: 'Sécurité & Vérification KYC', breadcrumb: 'Compte > Conformité' };
      case '/notifications':
        return { title: 'Centre de Notifications', breadcrumb: 'Compte > Alertes' };
      case '/profile':
        return { title: 'Paramètres du Profil', breadcrumb: 'Compte > Profil' };
      default:
        return { title: 'Plateforme TRUST', breadcrumb: 'TRUST' };
    }
  };

  const meta = getPageMeta(location.pathname);

  const mockNotifications = [
    {
      id: 1,
      title: 'Fonds séquestrés reçus',
      desc: 'MacBook Pro 16" : 1 450 000 FCFA bloqués avec succès.',
      time: 'Il y a 25 min',
      icon: Clock,
      color: 'text-amber-400 bg-amber-400/10',
    },
    {
      id: 2,
      title: 'Paiement débloqué avec succès',
      desc: 'Prestation Dev Web : 594 000 FCFA versés sur votre solde.',
      time: 'Il y a 3 heures',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-400/10',
    },
    {
      id: 3,
      title: 'Vérification KYC Approuvée',
      desc: 'Votre compte est validé au niveau maximal.',
      time: 'Hier',
      icon: Shield,
      color: 'text-purple-400 bg-purple-400/10',
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F14]/80 backdrop-blur-md px-4 sm:px-6">
      {/* Left section: mobile hamburger + title & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-400 hidden sm:block">
            {meta.breadcrumb}
          </span>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F4F6FC] tracking-tight">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right section: Demo Mode Pill, Search, ThemeToggle, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Mode Toggle Switch */}
        <button
          onClick={toggleDemoMode}
          className={cn(
            'hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
            isDemoMode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
          )}
          title="Basculer entre les données de démonstration et l'API réelle"
        >
          <span className={cn('w-2 h-2 rounded-full', isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} />
          {isDemoMode ? 'Démo Active' : 'API En Direct'}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-[#F4F6FC] hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title={`Thème actuel : ${resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}`}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-[#F4F6FC] hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7B3DFF]" />
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-sm text-slate-900 dark:text-[#F4F6FC]">
                  Notifications récentes
                </span>
                <span className="text-xs text-[#7B3DFF] hover:underline cursor-pointer">
                  Tout marquer comme lu
                </span>
              </div>
              <div className="py-2 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors cursor-pointer">
                    <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', notif.color)}>
                      <notif.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-[#F4F6FC]">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {notif.desc}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {notif.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full mt-2 py-2 text-center text-xs font-medium text-[#7B3DFF] hover:bg-[#7B3DFF]/10 rounded-xl transition-colors"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7B3DFF] to-[#00E5FF] p-0.5">
              <div className="w-full h-full rounded-full bg-[#0B0F14] flex items-center justify-center text-[10px] font-bold text-white">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'TR'}
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:block max-w-[100px] truncate">
              {user?.username || 'Invité'}
            </span>
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131820] border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F4F6FC]">
                  {user?.full_name || user?.username || 'Compte TRUST'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'user@trust.sn'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <User size={14} />
                  Mon Profil
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/security');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <Shield size={14} />
                  Sécurité & KYC
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/api-keys');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Accès Développeur
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                >
                  <LogOut size={14} />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
