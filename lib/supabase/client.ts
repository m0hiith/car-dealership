import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { getSupabasePublicEnv } from './env';

/** Supabase client for Client Components. Uses the anon key, so RLS applies. */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
