import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ADMIN_LOGIN } from '@/lib/validation/auth';

export type AdminSession = {
  user: User;
  role: Database['public']['Tables']['admin_users']['Row']['role'];
};

type AuthState = { status: 'anonymous' } | { status: 'forbidden'; user: User } | ({ status: 'admin' } & AdminSession);

/**
 * getUser() verifies the session with Supabase Auth (not just the cookie).
 * The admin_users lookup runs under RLS, which only lets a user see their own
 * row. Memoised per request.
 */
const getAuthState = cache(async (): Promise<AuthState> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'anonymous' };

  const { data, error } = await supabase.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(`Could not check admin access: ${error.message}`);
  if (!data) return { status: 'forbidden', user };

  return { status: 'admin', user, role: data.role };
});

/** The signed-in admin, or null for visitors and non-admin accounts. */
export async function getAdmin(): Promise<AdminSession | null> {
  const state = await getAuthState();
  return state.status === 'admin' ? { user: state.user, role: state.role } : null;
}

/**
 * Call at the top of every admin layout, page and Server Action (CLAUDE.md §5).
 * The proxy also checks, but it is only a first line of defence.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const state = await getAuthState();
  if (state.status === 'anonymous') redirect(ADMIN_LOGIN);
  if (state.status === 'forbidden') redirect(`${ADMIN_LOGIN}?error=forbidden`);
  return { user: state.user, role: state.role };
}
