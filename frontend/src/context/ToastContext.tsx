import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  ExternalLink,
  BellRing,
} from 'lucide-react';
import {
  getPlatformSettings,
  loadPlatformSettings,
  BroadcastAnnouncement,
} from '@/lib/platform-settings';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'announcement';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  imageUrl?: string;
  duration?: number; // ms, default 5000
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  broadcastModal: BroadcastAnnouncement | null;
  openBroadcastModal: (announcement: BroadcastAnnouncement) => void;
  closeBroadcastModal: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [broadcastModal, setBroadcastModal] = useState<BroadcastAnnouncement | null>(null);

  // Load the server-side broadcast popup if enabled and not dismissed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkBroadcast = () => {
      const settings = getPlatformSettings();
      const announcement = settings.announcement;
      if (!announcement || !announcement.enabled) return;
      const dismissed = localStorage.getItem(`trust_dismissed_popup_${announcement.id}`);
      if (dismissed) return;
      // Delay popup by 1.2s for a pleasant entrance after initial page load.
      timer = setTimeout(() => setBroadcastModal(announcement), 1200);
    };

    const bootstrap = async () => {
      try {
        await loadPlatformSettings();
      } catch {
        // Offline or public page: fall back to the cached/default configuration.
      }
      checkBroadcast();
    };

    bootstrap();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const showToast = (toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { ...toast, id, duration: toast.duration ?? 5000 };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 toasts

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openBroadcastModal = (announcement: BroadcastAnnouncement) => {
    setBroadcastModal(announcement);
  };

  const closeBroadcastModal = () => {
    if (broadcastModal) {
      localStorage.setItem(`trust_dismissed_popup_${broadcastModal.id}`, 'true');
    }
    setBroadcastModal(null);
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle size={18} className="text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
      case 'announcement':
        return <Sparkles size={18} className="text-[#00E5FF] shrink-0" />;
      default:
        return <Info size={18} className="text-[#7B3DFF] shrink-0" />;
    }
  };

  const getToastBorder = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'error':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'announcement':
        return 'border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]';
      default:
        return 'border-[#7B3DFF]/30 bg-[#7B3DFF]/10 text-[#7B3DFF]';
    }
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        broadcastModal,
        openBroadcastModal,
        closeBroadcastModal,
      }}
    >
      {children}

      {/* ─── TOAST NOTIFICATIONS CONTAINER (Top-Right Floating Stack) ─── */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#131820]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_12px_36px_rgba(0,0,0,0.25)] text-slate-900 dark:text-[#F4F6FC] animate-modal-enter transition-all group"
            role="alert"
          >
            {/* Optional Thumbnail Image */}
            {toast.imageUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={toast.imageUrl} alt={toast.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`p-2 rounded-xl shrink-0 ${getToastBorder(toast.type)}`}>
                {getToastIcon(toast.type)}
              </div>
            )}

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
              )}

              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#7B3DFF] dark:text-[#00E5FF] hover:underline"
                >
                  <span>{toast.action.label}</span>
                </button>
              )}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ─── RICH BROADCAST POP-UP MODAL WITH IMAGE ─── */}
      {broadcastModal && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="relative bg-white dark:bg-[#131820] max-w-lg w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button top-right */}
            <button
              onClick={closeBroadcastModal}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            {/* Announcement Image Banner */}
            {broadcastModal.imageUrl && (
              <div className="relative w-full h-48 sm:h-56 bg-slate-900 overflow-hidden">
                <img
                  src={broadcastModal.imageUrl}
                  alt={broadcastModal.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131820] via-transparent to-transparent" />
                {broadcastModal.badge && (
                  <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#7B3DFF] text-white shadow-lg">
                    <Sparkles size={12} />
                    {broadcastModal.badge}
                  </span>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-4">
              {!broadcastModal.imageUrl && broadcastModal.badge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#7B3DFF]/20 text-[#00E5FF] border border-[#7B3DFF]/40">
                  <Sparkles size={12} />
                  {broadcastModal.badge}
                </span>
              )}

              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-[#F4F6FC]">
                  {broadcastModal.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {broadcastModal.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {broadcastModal.actionText && (
                  <a
                    href={broadcastModal.actionUrl || '#'}
                    onClick={() => closeBroadcastModal()}
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7B3DFF] to-[#9e6bfa] hover:from-[#6c28f0] hover:to-[#8c52f0] text-white font-bold text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(123,61,255,0.3)]"
                  >
                    <span>{broadcastModal.actionText}</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeBroadcastModal}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Ne plus afficher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
