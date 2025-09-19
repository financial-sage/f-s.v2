export type AppUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  picture?: string | null;
  role?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown>;
}

export type AppSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: AppUser | null;
}

/** Mapea la Session de Supabase al AppSession de la app */

export function mapSupabaseSessionToApp(session: unknown): AppSession | null {
  // Minimal supabase shape for our mapping
  type SupabaseUser = {
    id?: string;
    email?: string | null;
    created_at?: string | null;
    role?: string | null;
    user_metadata?: Record<string, unknown>;
    raw_user_meta_data?: Record<string, unknown>;
  };
  type SupabaseSession = {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    user?: SupabaseUser | null;
  };

  if (!session) return null;
  const s = session as SupabaseSession;
  const user = s.user ?? null;
  const userMeta = (user?.user_metadata ?? user?.raw_user_meta_data ?? {}) as Record<string, unknown>;
  const id = user?.id ?? '';
  const email = user?.email ?? null;
  const created_at = user?.created_at ?? null;
  const role = user?.role ?? null;
  const full_name = typeof userMeta?.full_name === 'string'
    ? (userMeta.full_name as string)
    : typeof userMeta?.name === 'string'
      ? (userMeta.name as string)
      : null;
      
  const picture = typeof userMeta?.picture === 'string'
    ? (userMeta.picture as string)
    : typeof userMeta?.avatar_url === 'string'
      ? (userMeta.avatar_url as string)
      : typeof userMeta?.image === 'string'
        ? (userMeta.image as string)
        : null;

  const appUser: AppUser = {
    id,
    email,
    full_name,
    picture,
    role,
    created_at,
    metadata: userMeta,
  };

  return {
    access_token: s.access_token ?? '',
    refresh_token: s.refresh_token ?? '',
    expires_at: s.expires_at,
    user: appUser,
  };
}

// Account/Wallet types
export type AccountType = 'cash' | 'bank_account' | 'credit_card' | 'debit_card' | 'digital_wallet';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  icon?: string;
  color: string;
  bank_name?: string;
  last_four_digits?: string;
  created_at: string;
  updated_at: string;
}

export interface NewAccount {
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
  is_default?: boolean;
  icon?: string;
  color?: string;
  bank_name?: string;
  last_four_digits?: string;
}

export interface AccountResult {
  data?: Account | Account[];
  error?: Error | { message: string } | null;
}

