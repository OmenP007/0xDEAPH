export type FinancialTransactionType =
  | 'ESCROW_DEPOSIT'     // Fonds consignés pour un séquestre (Débit)
  | 'ESCROW_PAYOUT'      // Fonds reçus suite à libération séquestre (Crédit)
  | 'ESCROW_REFUND'      // Remboursement suite à annulation/litige (Crédit)
  | 'WALLET_TOPUP'       // Rechargement portefeuille (Crédit)
  | 'WALLET_WITHDRAWAL'  // Retrait vers compte bancaire / Mobile Money (Débit)
  | 'PLATFORM_FEE';      // Frais de commission TRUST 1% (Frais)

export interface FinancialLedgerEntry {
  id: string | number;
  reference: string;
  type: FinancialTransactionType;
  description: string;
  amount: number;
  direction: 'IN' | 'OUT'; // IN = Crédit (+), OUT = Débit (-)
  fee: number;
  payment_method: 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER' | 'ESCROW_BALANCE';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  related_escrow_id?: string | number;
  date: string;
}

export type EscrowStatus = 'CREATED' | 'BLOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
export type InitiatorRole = 'buyer' | 'seller';
export type UserRole = 'client' | 'seller' | 'member' | 'developer' | 'deaph';
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
  checkout_url?: string;
  provider_reference?: string;
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
  paiement_reference?: string;
  paiement_amount?: number;
  paiement_title?: string;
  buyer_username?: string;
  seller_username?: string;
  opened_by?: number;
  opened_by_username: string;
  reason: string;
  details: string;
  status: 'OPEN' | 'RESOLVED_RELEASE' | 'RESOLVED_REFUND' | 'RESOLVED' | 'CLOSED';
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

export type KYCIdType = 'cni' | 'passport' | 'driving_license';

export interface KYCVerification {
  id: string | number;
  user?: number;
  user_username?: string;
  user_email?: string;
  id_type: KYCIdType;
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

export type WalletTransactionType = 'TOPUP' | 'WITHDRAWAL';
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type WalletMethod = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER';

export interface WalletTransaction {
  id: string | number;
  reference: string;
  type: WalletTransactionType;
  type_label?: string;
  amount: number;
  fee: number;
  method: WalletMethod;
  method_label?: string;
  phone?: string;
  beneficiary_name?: string;
  status: WalletTransactionStatus;
  status_label?: string;
  provider_reference?: string;
  failure_reason?: string;
  created_at: string;
  completed_at?: string | null;
}

export interface WalletSummary {
  balance: number;
  available_balance: number;
  pending_withdrawals: number;
  escrow_credits: number;
  topups: number;
  withdrawals: number;
  wallet_id: string;
  transactions: WalletTransaction[];
}

export interface PlatformAnnouncementApi {
  id?: string;
  enabled?: boolean;
  title?: string;
  message?: string;
  imageUrl?: string;
  badge?: string;
  actionText?: string;
  actionUrl?: string;
  targetRole?: string;
  createdAt?: string;
}

export interface PlatformSettingsApi {
  auto_release_delay_days: number;
  commission_rate_percent: number;
  min_escrow_amount: number;
  maintenance_mode: boolean;
  announcement: PlatformAnnouncementApi | Record<string, never>;
  updated_at?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  date: string;
  type: 'escrow' | 'dispute' | 'wallet' | 'kyc' | 'info';
  link?: string;
  read?: boolean;
}

export interface DashboardStats {
  available_balance: number;
  in_escrow_amount: number;
  total_transactions_count: number;
  active_escrows_count: number;
  completed_escrows_count: number;
  disputes_count: number;
}
