import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  Wallet,
  Key,
  Bell,
  Shield,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  PlusCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
    { label: 'Mes Séquestres', to: '/escrow', icon: ShieldCheck },
    { label: 'Créer un Escrow', to: '/escrow/new', icon: PlusCircle, highlight: true },
    { label: 'Liens Paylink', to: '/offers', icon: LinkIcon },
    { label: 'Portefeuille', to: '/wallet', icon: Wallet },
    { label: 'Clés API (Dev)', to: '/api-keys', icon: Key },
    { label: 'Sécurité & KYC', to: '/security', icon: Shield },
    { label: 'Notifications', to: '/notifications', icon: Bell, badge: '3' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0E131C] border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header with official TRUST logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
            onClick={() => navigate('/dashboard')}
          >
            <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden bg-[#7B3DFF]/10 flex items-center justify-center p-1">
              <img
                src="/logo.png"
                alt="TRUST Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#F4F6FC] flex items-center gap-1.5">
                  TRUST
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] border border-[#7B3DFF]/20">
                    ESCROW
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium tracking-tight -mt-0.5">
                  Trust every transaction.
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title={collapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Demo Mode Badge */}
        {isDemoMode && !collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
            <Sparkles size={14} className="shrink-0" />
            <span className="font-medium">Mode Démonstration Actif</span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-[#7B3DFF] text-white shadow-[0_4px_12px_rgba(123,61,255,0.25)]'
                    : item.highlight
                    ? 'bg-[#7B3DFF]/10 text-[#7B3DFF] dark:text-[#a277ff] hover:bg-[#7B3DFF]/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                size={20}
                className={cn('shrink-0 transition-transform group-hover:scale-105')}
              />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0A0E15]">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer',
              collapsed && 'justify-center p-1'
            )}
            onClick={() => navigate('/profile')}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7B3DFF] to-[#00E5FF] p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-[#0B0F14] flex items-center justify-center text-xs font-bold text-white">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'TR'}
              </div>
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FC] truncate">
                  {user?.full_name || user?.username || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || 'user@trust.sn'}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
