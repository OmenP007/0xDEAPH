import {
  EscrowTransaction,
  Offer,
  Dispute,
  APIKeyItem,
  KYCVerification,
  UserProfile,
  WalletSummary,
  WalletTransaction,
  PlatformSettingsApi,
} from '@/types/escrow';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const ACCESS_TOKEN_KEY = 'trust_token';
const REFRESH_TOKEN_KEY = 'trust_refresh_token';
const USER_KEY = 'trust_user';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function firstMessage(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of ['detail', 'message', 'non_field_errors', 'error']) {
      if (key in value) {
        const msg = firstMessage(value[key]);
        if (msg) return msg;
      }
    }
    for (const item of Object.values(value)) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
  }
  return null;
}

function parseError(status: number, data: any): ApiError {
  const message = firstMessage(data) || `Erreur API (${status})`;
  return new ApiError(message, status, data);
}

class ApiClient {
  private token: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.token = localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  setRefreshToken(token: string | null) {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private clearSession() {
    this.setToken(null);
    this.setRefreshToken(null);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('trust:auth-expired'));
  }

  private async refreshAccessToken(): Promise<string | null | 'unavailable'> {
    const refresh = this.getRefreshToken();
    if (!refresh) return null;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!response.ok) {
          // 400/401 → refresh token really is invalid. Any other status
          // (429, 5xx) is transient: keep the session instead of logging out.
          return response.status === 400 || response.status === 401
            ? null
            : 'unavailable';
        }
        const data = await response.json();
        if (!data?.access) return null;
        this.setToken(data.access);
        if (data.refresh) this.setRefreshToken(data.refresh);
        return data.access as string;
      } catch {
        return 'unavailable';
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    allowRefresh = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const currentToken = this.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new ApiError(
        'Serveur injoignable. Vérifiez votre connexion puis réessayez.',
        0
      );
    }

    if (
      response.status === 401 &&
      allowRefresh &&
      !endpoint.startsWith('/api/token/')
    ) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed === 'unavailable') {
        // Temporary server/rate-limit issue while refreshing: do not destroy
        // the local session, surface a retryable error instead.
        throw new ApiError(
          'Session temporairement indisponible. Vérifiez votre connexion puis réessayez.',
          0
        );
      }
      if (refreshed) {
        return this.request<T>(endpoint, options, false);
      }
      this.clearSession();
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');

    if (!response.ok) {
      throw parseError(response.status, payload);
    }

    return payload as T;
  }

  private extractList<T>(res: any): T[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  async login(
    identifier: string,
    password: string
  ): Promise<{
    access: string;
    refresh?: string;
    role?: string;
    username?: string;
    email?: string;
    user_id?: number;
    user?: UserProfile;
  }> {
    const res = await this.request<{
      access: string;
      refresh?: string;
      role?: string;
      username?: string;
      email?: string;
      user_id?: number;
      user?: UserProfile;
    }>('/api/token/', {
      method: 'POST',
      body: JSON.stringify({ username: identifier, password }),
    });
    this.setToken(res.access);
    if (res.refresh) this.setRefreshToken(res.refresh);
    if (res.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    return res;
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    password2: string;
    role?: string;
  }): Promise<UserProfile> {
    if (data.role === 'developer') {
      const { role: _role, ...payload } = data;
      return this.request<UserProfile>('/api/developer/register/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    return this.request<UserProfile>('/api/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/me/');
  }

  async updateMe(data: {
    email?: string;
    full_name?: string;
    phone?: string;
  }): Promise<UserProfile> {
    return this.request<UserProfile>('/api/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  logout() {
    this.setToken(null);
    this.setRefreshToken(null);
    localStorage.removeItem(USER_KEY);
  }

  // ─── PAYMENTS / ESCROW ─────────────────────────────────────────────────────
  async getPayments(): Promise<EscrowTransaction[]> {
    const res = await this.request<any>('/api/payments/');
    return this.extractList<EscrowTransaction>(res);
  }

  async getPayment(id: string | number): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>(`/api/payments/${id}/`);
  }

  async createPayment(data: {
    amount: number;
    seller_username: string;
    item_title: string;
    item_description?: string;
    delivery_terms?: string;
  }): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>('/api/payments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmDelivery(
    id: string | number,
    otp?: string
  ): Promise<{ status: string; detail?: string }> {
    return this.request<{ status: string; detail?: string }>(
      `/api/payments/${id}/confirm-delivery/`,
      {
        method: 'POST',
        body: JSON.stringify(otp ? { otp } : {}),
      }
    );
  }

  async releasePayment(id: string | number): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>(`/api/payments/${id}/release/`, {
      method: 'POST',
    });
  }

  async refundPayment(id: string | number): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>(`/api/payments/${id}/refund/`, {
      method: 'POST',
    });
  }

  async openDispute(
    id: string | number,
    reason: string,
    details: string
  ): Promise<Dispute> {
    return this.request<Dispute>(`/api/payments/${id}/dispute/`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }

  // ─── OFFERS / PAYLINKS ─────────────────────────────────────────────────────
  async getOffers(): Promise<Offer[]> {
    const res = await this.request<any>('/api/offers/');
    return this.extractList<Offer>(res);
  }

  async getOffer(code: string): Promise<Offer> {
    return this.request<Offer>(`/api/offers/${encodeURIComponent(code)}/`);
  }

  async createOffer(data: {
    title: string;
    description: string;
    amount: number;
    delivery_terms?: string;
  }): Promise<Offer> {
    return this.request<Offer>('/api/offers/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkoutOffer(code: string): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>(
      `/api/offers/${encodeURIComponent(code)}/checkout/`,
      { method: 'POST', body: JSON.stringify({}) }
    );
  }

  // ─── DISPUTES ──────────────────────────────────────────────────────────────
  async getDisputes(): Promise<Dispute[]> {
    const res = await this.request<any>('/api/disputes/');
    return this.extractList<Dispute>(res);
  }

  async resolveDispute(
    disputeId: string | number,
    action: 'release' | 'refund',
    resolution_notes: string
  ): Promise<Dispute> {
    return this.request<Dispute>(`/api/disputes/${disputeId}/resolve/`, {
      method: 'POST',
      body: JSON.stringify({ action, resolution_notes }),
    });
  }

  // ─── KYC ───────────────────────────────────────────────────────────────────
  async getKYC(): Promise<KYCVerification | null> {
    try {
      const res = await this.request<any>('/api/kyc/');
      if (Array.isArray(res) && res.length > 0) return res[0];
      if (res && res.status && res.status !== 'NONE') return res;
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async getAllKYC(): Promise<KYCVerification[]> {
    const res = await this.request<any>('/api/kyc/?all=true');
    return this.extractList<KYCVerification>(res);
  }

  async reviewKYC(
    kycId: string | number,
    status: 'APPROVED' | 'REJECTED',
    rejection_reason?: string
  ): Promise<KYCVerification> {
    return this.request<KYCVerification>(`/api/kyc/${kycId}/review/`, {
      method: 'POST',
      body: JSON.stringify({ status, rejection_reason: rejection_reason || '' }),
    });
  }

  async submitKYC(data: {
    id_type: string;
    id_number: string;
    full_name: string;
    document_url: string;
  }): Promise<KYCVerification> {
    return this.request<KYCVerification>('/api/kyc/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── API KEYS ──────────────────────────────────────────────────────────────
  async getAPIKeys(): Promise<APIKeyItem[]> {
    const res = await this.request<any>('/api/keys/');
    return this.extractList<APIKeyItem>(res);
  }

  async createAPIKey(data: {
    name: string;
    scopes: string[];
    expires_at?: string;
  }): Promise<APIKeyItem> {
    return this.request<APIKeyItem>('/api/keys/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeAPIKey(id: string | number): Promise<void> {
    await this.request<void>(`/api/keys/${id}/revoke/`, {
      method: 'DELETE',
    });
  }

  // ─── WALLET ────────────────────────────────────────────────────────────────
  async getWallet(): Promise<WalletSummary> {
    return this.request<WalletSummary>('/api/wallet/');
  }

  async requestTopup(data: {
    amount: number;
    method: string;
    phone?: string;
  }): Promise<{ detail: string; transaction: WalletTransaction } & WalletSummary> {
    return this.request<{ detail: string; transaction: WalletTransaction } & WalletSummary>(
      '/api/wallet/topup/',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async requestWithdraw(data: {
    amount: number;
    method: string;
    phone?: string;
    beneficiary_name?: string;
  }): Promise<{ detail: string; transaction: WalletTransaction } & WalletSummary> {
    return this.request<{ detail: string; transaction: WalletTransaction } & WalletSummary>(
      '/api/wallet/withdraw/',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async reviewWalletTransaction(
    id: string | number,
    status: 'COMPLETED' | 'FAILED',
    extra: { provider_reference?: string; failure_reason?: string } = {}
  ): Promise<WalletTransaction> {
    return this.request<WalletTransaction>(
      `/api/wallet/transactions/${id}/review/`,
      {
        method: 'POST',
        body: JSON.stringify({ status, ...extra }),
      }
    );
  }

  // ─── PLATFORM ──────────────────────────────────────────────────────────────
  async getPlatformSettings(): Promise<PlatformSettingsApi> {
    return this.request<PlatformSettingsApi>('/api/platform/settings/');
  }

  async updatePlatformSettings(
    data: Partial<PlatformSettingsApi>
  ): Promise<PlatformSettingsApi> {
    return this.request<PlatformSettingsApi>('/api/platform/settings/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async triggerAutoRelease(): Promise<{
    status: string;
    released_count: number;
    released_payment_ids: number[];
  }> {
    return this.request<{
      status: string;
      released_count: number;
      released_payment_ids: number[];
    }>('/api/payments/auto-release/', { method: 'POST' });
  }
}

export const api = new ApiClient();
export { API_BASE_URL };
