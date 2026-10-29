import { UserProfile } from '@/types/escrow';

/** A client (buyer) is the only role allowed to initiate a direct escrow payment. */
export function canCreateEscrow(user: UserProfile | null): boolean {
  return user?.role === 'client';
}

/** Sellers / members / admins can create Paylink offers. */
export function canCreateOffer(user: UserProfile | null): boolean {
  if (!user) return false;
  return ['seller', 'member', 'deaph'].includes(user.role);
}

/** API keys are limited to developer accounts and staff. */
export function canManageApiKeys(user: UserProfile | null): boolean {
  if (!user) return false;
  return ['developer', 'deaph'].includes(user.role) || Boolean((user as any).is_staff);
}

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === 'deaph';
}

export function roleLabel(role?: string): string {
  switch (role) {
    case 'client':
      return 'Client / Acheteur';
    case 'seller':
      return 'Vendeur';
    case 'member':
      return 'Membre';
    case 'developer':
      return 'Développeur';
    case 'deaph':
      return 'Administrateur';
    default:
      return 'Membre';
  }
}
