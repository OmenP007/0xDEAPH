export type EscrowStatus = 'CREATED' | 'BLOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
export type InitiatorRole = 'buyer' | 'seller';

export interface EscrowTransaction {
  id: string;
  reference: string;
  title: string;
  description: string;
  amount: number; // in FCFA (XOF)
  fee_amount: number; // 1%
  net_amount: number; // 99%
  currency: 'XOF';
  status: EscrowStatus;
  buyer_name: string;
  buyer_phone: string;
  seller_name: string;
  seller_phone: string;
  role_current_user: 'buyer' | 'seller';
  initiator_role?: InitiatorRole;
  delivery_otp?: string; // OTP à 6 chiffres (visible uniquement par l'acheteur)
  offer_code?: string;
  avatar_url?: string;
  created_at: string;
  blocked_at?: string;
  auto_release_at?: string;
  delivery_tracking?: string;
  dispute_reason?: string;
}

export interface Offer {
  id: string;
  code: string; // ex: OFF-82A1-9F2B
  title: string;
  description: string;
  amount: number;
  currency: 'XOF';
  delivery_terms: string;
  is_active: boolean;
  seller_name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'client' | 'developer' | 'deaph';
  is_kyc_approved: boolean;
  avatar_url?: string;
}

export interface EscrowStatsData {
  total_escrowed: number;
  active_count: number;
  completed_count: number;
  dispute_count: number;
}
