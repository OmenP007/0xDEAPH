import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppNotification, Dispute, EscrowTransaction, WalletTransaction } from '@/types/escrow';

const READ_STORAGE_PREFIX = 'trust_notifications_read_';

interface NotificationData {
  payments: EscrowTransaction[];
  disputes: Dispute[];
  walletTransactions: WalletTransaction[];
}

// Shared, short-lived cache so the TopBar badge and the Notifications page
// do not each re-fetch the same three endpoints on every mount.
const CACHE_TTL_MS = 15_000;
const dataCache = new Map<string | number, { at: number; data: NotificationData }>();
const inFlight = new Map<string | number, Promise<NotificationData>>();

async function fetchNotificationData(userId: string | number, force = false): Promise<NotificationData> {
  const now = Date.now();
  const cached = dataCache.get(userId);
  if (!force && cached && now - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }
  const pending = inFlight.get(userId);
  if (!force && pending) {
    return pending;
  }

  const request = (async () => {
    const [paymentsRes, disputesRes, walletRes] = await Promise.allSettled([
      api.getPayments(),
      api.getDisputes(),
      api.getWallet(),
    ]);
    const data: NotificationData = {
      payments: paymentsRes.status === 'fulfilled' ? paymentsRes.value : [],
      disputes: disputesRes.status === 'fulfilled' ? disputesRes.value : [],
      walletTransactions:
        walletRes.status === 'fulfilled' ? walletRes.value.transactions || [] : [],
    };
    dataCache.set(userId, { at: Date.now(), data });
    return data;
  })();

  inFlight.set(userId, request);
  try {
    return await request;
  } finally {
    inFlight.delete(userId);
  }
}


function buildNotifications(
  payments: EscrowTransaction[],
  disputes: Dispute[],
  walletTransactions: WalletTransaction[]
): AppNotification[] {
  const items: AppNotification[] = [];

  for (const p of payments) {
    const ref = p.reference || `#${p.id}`;
    const title = p.item_title || 'Transaction séquestrée';
    const link = `/escrow/${p.id}`;

    if (p.status === 'BLOCKED') {
      items.push({
        id: `escrow-blocked-${p.id}`,
        title: p.role_current_user === 'buyer' ? 'Séquestre actif' : 'Fonds consignés en votre faveur',
        desc:
          p.role_current_user === 'buyer'
            ? `${title} (${ref}) — validez la livraison avec votre code OTP.`
            : `${title} (${ref}) — en attente de confirmation de livraison.`,
        date: p.blocked_at || p.created_at,
        type: 'escrow',
        link,
      });
    } else if (p.status === 'CREATED') {
      items.push({
        id: `escrow-created-${p.id}`,
        title: 'Paiement en attente de confirmation',
        desc: `${title} (${ref}) — le règlement n'a pas encore été confirmé.`,
        date: p.created_at,
        type: 'escrow',
        link,
      });
    } else if (p.status === 'RELEASED') {
      items.push({
        id: `escrow-released-${p.id}`,
        title: 'Fonds libérés',
        desc: `${title} (${ref}) — la livraison a été confirmée.`,
        date: p.blocked_at || p.created_at,
        type: 'escrow',
        link,
      });
    } else if (p.status === 'REFUNDED') {
      items.push({
        id: `escrow-refunded-${p.id}`,
        title: 'Transaction remboursée',
        desc: `${title} (${ref}) — les fonds ont été remboursés à l'acheteur.`,
        date: p.created_at,
        type: 'escrow',
        link,
      });
    } else if (p.status === 'DISPUTED') {
      items.push({
        id: `escrow-disputed-${p.id}`,
        title: 'Litige en cours',
        desc: `${title} (${ref}) — un médiateur TRUST examine le dossier.`,
        date: p.created_at,
        type: 'dispute',
        link,
      });
    }
  }

  for (const d of disputes) {
    if (d.status === 'OPEN') {
      items.push({
        id: `dispute-${d.id}`,
        title: 'Médiation ouverte',
        desc: `Litige sur ${d.paiement_title || d.paiement_reference || `le paiement #${d.paiement}`} : ${d.reason}`,
        date: d.created_at,
        type: 'dispute',
        link: `/escrow/${d.paiement}`,
      });
    }
  }

  for (const t of walletTransactions) {
    const isTopup = t.type === 'TOPUP';
    const label = isTopup ? 'Rechargement' : 'Retrait';
    if (t.status === 'PENDING') {
      items.push({
        id: `wallet-pending-${t.id}`,
        title: `${label} en attente de confirmation`,
        desc: `${t.reference} — ${Number(t.amount).toLocaleString('fr-FR')} FCFA via ${t.method_label || t.method}.`,
        date: t.created_at,
        type: 'wallet',
        link: '/wallet',
      });
    } else if (t.status === 'COMPLETED') {
      items.push({
        id: `wallet-completed-${t.id}`,
        title: `${label} confirmé`,
        desc: `${t.reference} — ${Number(t.amount).toLocaleString('fr-FR')} FCFA via ${t.method_label || t.method}.`,
        date: t.completed_at || t.created_at,
        type: 'wallet',
        link: '/wallet',
      });
    } else if (t.status === 'FAILED') {
      items.push({
        id: `wallet-failed-${t.id}`,
        title: `${label} échoué`,
        desc: t.failure_reason || `${t.reference} n'a pas pu être traité.`,
        date: t.created_at,
        type: 'wallet',
        link: '/wallet',
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function useAppNotifications() {
  const { user } = useAuth();
  const cached = user ? dataCache.get(user.id)?.data : undefined;
  const [payments, setPayments] = useState<EscrowTransaction[]>(cached?.payments ?? []);
  const [disputes, setDisputes] = useState<Dispute[]>(cached?.disputes ?? []);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(
    cached?.walletTransactions ?? []
  );
  const [loading, setLoading] = useState(!cached);
  const [readIds, setReadIds] = useState<string[]>([]);

  const storageKey = `${READ_STORAGE_PREFIX}${user?.id ?? 'guest'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setReadIds(raw ? JSON.parse(raw) : []);
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  const refresh = useCallback(async () => {
    if (!user) {
      setPayments([]);
      setDisputes([]);
      setWalletTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const apply = (data: NotificationData) => {
      setPayments(data.payments);
      setDisputes(data.disputes);
      setWalletTransactions(data.walletTransactions);
    };
    const cached = dataCache.get(user.id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      apply(cached.data);
      setLoading(false);
      return;
    }
    try {
      apply(await fetchNotificationData(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const forceRefresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchNotificationData(user.id, true);
      setPayments(data.payments);
      setDisputes(data.disputes);
      setWalletTransactions(data.walletTransactions);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);


  const notifications = useMemo(
    () => buildNotifications(payments, disputes, walletTransactions),
    [payments, disputes, walletTransactions]
  );

  const markAllRead = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    setReadIds(ids);
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // Ignore storage errors.
    }
  }, [notifications, storageKey]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return {
    notifications: notifications.map((n) => ({ ...n, read: readIds.includes(n.id) })),
    unreadCount,
    loading,
    refresh: forceRefresh,
    markAllRead,
  };
}
