import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** The visitor's IP as Vercel (or any proxy) reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Counts one attempt for this visitor under `scope` and returns true while
 * they are within `max` per `window` (a Postgres interval, e.g. '10 minutes').
 * Only a hash of the IP is stored. Fails open if the check itself errors,
 * so a database hiccup never loses a customer's request.
 */
export async function withinRateLimit(scope: string, limit: { max: number; window: string }): Promise<boolean> {
  const key = createHash('sha256')
    .update(`${scope}:${await clientIp()}`)
    .digest('hex');
  const { data, error } = await createSupabaseAdminClient().rpc('take_lead_rate_limit', {
    p_key: key,
    p_max: limit.max,
    p_window: limit.window,
  });
  if (error) {
    console.error('Rate limit check failed', { scope, code: error.code, message: error.message });
    return true;
  }
  return data === true;
}
