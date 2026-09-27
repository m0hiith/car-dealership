import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { getSupabasePublicEnv } from './env';

/**
 * Refreshes the Supabase session for a proxy request and reports who is
 * signed in. Refreshed auth cookies are written to `response`; any redirect
 * the caller returns instead must copy them over with `withSessionCookies`,
 * or the browser and server fall out of sync and the user is logged out.
 */
export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Nothing may run between createServerClient and getClaims(): getClaims()
  // is what refreshes an expired token and verifies the JWT signature.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

  let isAdmin = false;
  if (userId) {
    const { data: admin, error } = await supabase.rpc('is_admin');
    isAdmin = !error && admin === true;
  }

  return { response, userId, isAdmin };
}

/** Carries refreshed session cookies over to a redirect. */
export function withSessionCookies(redirect: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
