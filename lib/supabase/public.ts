import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getSupabasePublicEnv } from './env';

/**
 * Anon client with no cookies, for public showroom reads. Needing no request
 * data is what lets these reads sit inside unstable_cache and be shared by
 * every visitor. RLS applies as for any anonymous visitor.
 */
export function createSupabasePublicClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
