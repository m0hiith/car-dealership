import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { isRecentlySold } from '@/lib/seo';
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

/**
 * True when the car's page should answer 410 Gone: archived, or sold more
 * than SOLD_PAGE_DAYS ago. A recently sold car's page stays live (it says
 * "sold" and suggests similar cars) so its search ranking is not lost at once.
 */
export async function isCarGone(slug: string, now = Date.now()): Promise<boolean> {
  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc('get_unavailable_car_by_slug', { p_slug: slug });
  if (error) {
    console.error('Could not check car status', { slug, code: error.code, message: error.message });
    return false;
  }
  const car = data[0];
  if (!car) return false;
  return car.status !== 'sold' || !isRecentlySold(car.sold_at, now);
}
