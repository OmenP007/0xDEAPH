import { EscrowTransaction, Offer, UserProfile } from '@/types/escrow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('0xseq_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('0xseq_token', token);
      } else {
        localStorage.removeItem('0xseq_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('0xseq_token');
    }
    return this.token;
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

    try {
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
            `Erreur API (${response.status})`
        );
      }

      return await response.json();
    } catch (err: unknown) {
      // Re-throw for handling
      throw err;
    }
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<{ access: string; refresh: string }> {
    const res = await this.request<{ access: string; refresh: string }>('/api/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.access);
    return res;
  }

  async register(data: {
    username: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
  }): Promise<UserProfile> {
    return this.request<UserProfile>('/api/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payments / Escrow
  async getPayments(): Promise<EscrowTransaction[]> {
    return this.request<EscrowTransaction[]>('/api/payments/');
  }

  async createPayment(data: {
    seller_username: string;
    amount: number;
    item_title: string;
    item_description?: string;
  }): Promise<EscrowTransaction> {
    return this.request<EscrowTransaction>('/api/payments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmDelivery(paymentId: string | number, otp?: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/payments/${paymentId}/confirm-delivery/`, {
      method: 'POST',
      body: JSON.stringify(otp ? { otp } : {}),
    });
  }

  async openDispute(paymentId: string | number, reason: string, details: string): Promise<unknown> {
    return this.request(`/api/payments/${paymentId}/dispute/`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }

  // Offers / Paylinks (Nouvel endpoint du backend)
  async getOffers(): Promise<Offer[]> {
    return this.request<Offer[]>('/api/offers/');
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
}

export const api = new ApiClient();
