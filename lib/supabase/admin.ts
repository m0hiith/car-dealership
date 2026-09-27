import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getSupabasePublicEnv } from './env';

/**
 * Service-role client. BYPASSES RLS, so only use it after requireAdmin() has
 * passed, or for trusted server work that anon cannot do (e.g. per-IP rate
 * limiting). The `server-only` import makes any client-side import a build
 * error.
 */
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (never to a NEXT_PUBLIC_ variable).');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
