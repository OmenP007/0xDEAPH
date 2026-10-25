export type EscrowStatus = 'CREATED' | 'BLOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
export type InitiatorRole = 'buyer' | 'seller';
export type UserRole = 'client' | 'developer' | 'deaph';
export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EscrowTransaction {
  id: string | number;
  reference?: string;
  item_title?: string;
  item_description?: string;
  delivery_terms?: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: 'XOF' | 'FCFA';
  status: EscrowStatus;
  buyer?: number;
  buyer_username?: string;
  seller?: number;
  seller_username?: string;
  buyer_name?: string;
  seller_name?: string;
  role_current_user?: 'buyer' | 'seller';
  initiator_role?: InitiatorRole;
  delivery_otp?: string; // Visible only to buyer
  offer?: number | null;
  offer_code?: string;
  created_at: string;
  blocked_at?: string;
  auto_release_at?: string;
  dispute_reason?: string;
}

export interface Offer {
  id: string | number;
  code: string; // e.g. OFF-82A1-9F2B
  title: string;
  description: string;
  amount: number;
  currency: string;
  delivery_terms?: string;
  is_active: boolean;
  seller?: number;
  seller_username: string;
  seller_kyc_approved?: boolean;
  seller_kyc_status?: KYCStatus;
  pay_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Dispute {
  id: string | number;
  paiement: string | number;
  opened_by?: number;
  opened_by_username: string;
  reason: string;
  details: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface APIKeyItem {
  id: string | number;
  name: string;
  prefix: string;
  scopes: string[];
  is_active: boolean;
  expires_at?: string;
  last_used?: string;
  created_at: string;
  secret?: string; // Only returned once upon creation
}

export interface KYCVerification {
  id: string | number;
  id_type: 'CNI' | 'PASSPORT' | 'PERMIS';
  id_number: string;
  full_name: string;
  document_url: string;
  status: KYCStatus;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface UserProfile {
  id: string | number;
  username: string;
  email: string;
  role: UserRole;
  is_kyc_approved?: boolean;
  phone?: string;
  full_name?: string;
}

export interface DashboardStats {
  available_balance: number;
  in_escrow_amount: number;
  total_transactions_count: number;
  active_escrows_count: number;
  completed_escrows_count: number;
  disputes_count: number;
}
