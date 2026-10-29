import { api } from '@/lib/api';
import { PlatformSettingsApi } from '@/types/escrow';

export interface BroadcastAnnouncement {
  id: string;
  enabled: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  badge?: string;
  actionText?: string;
  actionUrl?: string;
  targetRole?: 'all' | 'client' | 'developer' | 'seller';
  createdAt: string;
}

export interface PlatformSettings {
  autoReleaseDelayDays: number;
  autoReleaseDelayHours?: number;
  commissionRatePercent: number; // e.g. 1.00%
  minEscrowAmount: number; // e.g. 500
  maintenanceMode: boolean;
  announcement: BroadcastAnnouncement | null;
}

const SETTINGS_STORAGE_KEY = 'trust_platform_settings';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  autoReleaseDelayDays: 3,
  autoReleaseDelayHours: 72,
  commissionRatePercent: 1.0,
  minEscrowAmount: 500,
  maintenanceMode: false,
  announcement: {
    id: 'welcome-v2',
    enabled: true,
    title: 'Garantie Séquestre Renforcée',
    message:
      'Vos fonds sont protégés par le protocole TRUST avec validation de livraison par code OTP unique.',
    imageUrl:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    badge: 'Protection 100% Active',
    actionText: 'Découvrir la protection',
    actionUrl: '#how-it-works',
    targetRole: 'all',
    createdAt: new Date().toISOString(),
  },
};

function cacheSettings(settings: PlatformSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode) — in-memory defaults still work.
  }
  window.dispatchEvent(
    new CustomEvent('trust_platform_settings_updated', { detail: settings })
  );
}

export function getPlatformSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_SETTINGS;
    return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

function mapAnnouncement(raw: any): BroadcastAnnouncement | null {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return null;
  }
  return {
    id: String(raw.id || `ann-${raw.createdAt || raw.created_at || Date.now()}`),
    enabled: raw.enabled ?? true,
    title: raw.title || '',
    message: raw.message || '',
    imageUrl: raw.imageUrl || raw.image_url || undefined,
    badge: raw.badge || undefined,
    actionText: raw.actionText || raw.action_text || undefined,
    actionUrl: raw.actionUrl || raw.action_url || undefined,
    targetRole: raw.targetRole || raw.target_role || 'all',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function fromApiSettings(data: PlatformSettingsApi): PlatformSettings {
  return {
    autoReleaseDelayDays: Number(data.auto_release_delay_days ?? 3),
    autoReleaseDelayHours: Number(data.auto_release_delay_days ?? 3) * 24,
    commissionRatePercent: Number(data.commission_rate_percent ?? 1),
    minEscrowAmount: Number(data.min_escrow_amount ?? 500),
    maintenanceMode: Boolean(data.maintenance_mode),
    announcement: mapAnnouncement(data.announcement),
  };
}

function toApiSettings(settings: Partial<PlatformSettings>): Partial<PlatformSettingsApi> {
  const payload: Partial<PlatformSettingsApi> = {};
  if (settings.autoReleaseDelayDays !== undefined) {
    payload.auto_release_delay_days = Number(settings.autoReleaseDelayDays);
  }
  if (settings.commissionRatePercent !== undefined) {
    payload.commission_rate_percent = Number(settings.commissionRatePercent);
  }
  if (settings.minEscrowAmount !== undefined) {
    payload.min_escrow_amount = Number(settings.minEscrowAmount);
  }
  if (settings.maintenanceMode !== undefined) {
    payload.maintenance_mode = Boolean(settings.maintenanceMode);
  }
  if (settings.announcement !== undefined) {
    payload.announcement = settings.announcement
      ? {
          id: settings.announcement.id,
          enabled: settings.announcement.enabled,
          title: settings.announcement.title,
          message: settings.announcement.message,
          imageUrl: settings.announcement.imageUrl,
          badge: settings.announcement.badge,
          actionText: settings.announcement.actionText,
          actionUrl: settings.announcement.actionUrl,
          targetRole: settings.announcement.targetRole,
          createdAt: settings.announcement.createdAt,
        }
      : {};
  }
  return payload;
}

/** Loads the server-side platform configuration and refreshes the local cache. */
export async function loadPlatformSettings(): Promise<PlatformSettings> {
  const data = await api.getPlatformSettings();
  const settings = fromApiSettings(data);
  cacheSettings(settings);
  return settings;
}

/** Persists settings server-side (admin only), then refreshes the local cache. */
export async function savePlatformSettings(
  settings: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const data = await api.updatePlatformSettings(toApiSettings(settings));
  const updated = fromApiSettings(data);
  cacheSettings(updated);
  return updated;
}

/** Local-only helper used for optimistic previews when the API is unreachable. */
export function cachePlatformSettings(settings: PlatformSettings): PlatformSettings {
  cacheSettings(settings);
  return settings;
}
