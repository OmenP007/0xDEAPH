import {
  EscrowTransaction,
  Offer,
  Dispute,
  APIKeyItem,
  KYCVerification,
  UserProfile,
  DashboardStats,
} from '@/types/escrow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;
  private isDemoMode: boolean = false;

  constructor() {
    this.token = localStorage.getItem('trust_token');
    this.isDemoMode = localStorage.getItem('trust_demo_mode') === 'true';
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('trust_token', token);
    } else {
      localStorage.removeItem('trust_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('trust_token');
    }
    return this.token;
  }

  setDemoMode(val: boolean) {
    this.isDemoMode = val;
    localStorage.setItem('trust_demo_mode', String(val));
  }

  getDemoMode(): boolean {
    return this.isDemoMode;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const currentToken = this.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
          errorData.message ||
          errorData.non_field_errors?.[0] ||
          Object.values(errorData)[0] ||
          `Erreur API (${response.status})`
      );
    }

    return await response.json();
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  async login(username: string, password: string): Promise<{ access: string; refresh: string; user?: UserProfile }> {
    const res = await this.request<{ access: string; refresh: string }>('/api/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.access);
    if (res.refresh) {
      localStorage.setItem('trust_refresh_token', res.refresh);
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
    return this.request<UserProfile>('/api/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    this.setToken(null);
    localStorage.removeItem('trust_refresh_token');
    localStorage.removeItem('trust_user');
  }

  // ─── PAYMENTS / ESCROW ─────────────────────────────────────────────────────
  async getPayments(): Promise<EscrowTransaction[]> {
    return this.request<EscrowTransaction[]>('/api/payments/');
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

  async confirmDelivery(id: string | number, otp?: string): Promise<{ status: string; detail?: string }> {
    return this.request<{ status: string; detail?: string }>(`/api/payments/${id}/confirm-delivery/`, {
      method: 'POST',
      body: JSON.stringify(otp ? { otp } : {}),
    });
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

  async openDispute(id: string | number, reason: string, details: string): Promise<Dispute> {
    return this.request<Dispute>(`/api/payments/${id}/dispute/`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }

  // ─── OFFERS / PAYLINKS ─────────────────────────────────────────────────────
  async getOffers(): Promise<Offer[]> {
    return this.request<Offer[]>('/api/offers/');
  }

  async getOffer(code: string): Promise<Offer> {
    return this.request<Offer>(`/api/offers/${code}/`);
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
    return this.request<EscrowTransaction>(`/api/offers/${code}/checkout/`, {
      method: 'POST',
    });
  }

  // ─── DISPUTES ──────────────────────────────────────────────────────────────
  async getDisputes(): Promise<Dispute[]> {
    return this.request<Dispute[]>('/api/disputes/');
  }

  // ─── KYC ───────────────────────────────────────────────────────────────────
  async getKYC(): Promise<KYCVerification | null> {
    try {
      const res = await this.request<KYCVerification[]>('/api/kyc/');
      return Array.isArray(res) && res.length > 0 ? res[0] : null;
    } catch {
      return null;
    }
  }

  async submitKYC(data: {
    id_type: 'CNI' | 'PASSPORT' | 'PERMIS';
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
    return this.request<APIKeyItem[]>('/api/keys/');
  }

  async createAPIKey(data: { name: string; scopes: string[]; expires_at?: string }): Promise<APIKeyItem> {
    return this.request<APIKeyItem>('/api/keys/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeAPIKey(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/keys/${id}/revoke/`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
