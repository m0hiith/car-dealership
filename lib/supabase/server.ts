import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';
import { getSupabasePublicEnv } from './env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user (or anon) via the auth cookies. RLS applies.
 * Create a new one per request; never share it between requests.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Safe to ignore: the proxy
          // refreshes the session on every request.
        }
      },
    },
  });
}
