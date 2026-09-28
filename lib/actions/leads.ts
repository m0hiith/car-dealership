'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { z } from 'zod';
import { sendNewLeadEmail } from '@/lib/notifications/lead-email';
import { getPublicCarBySlug } from '@/lib/queries/car-detail';
import { getSiteSettings } from '@/lib/queries/settings';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { HONEYPOT_FIELD, leadSchema, type LeadField } from '@/lib/validation/lead';

export type LeadFormState =
  | { status: 'idle' }
  | { status: 'success'; name: string }
  | {
      status: 'error';
      error: string;
      fieldErrors?: Partial<Record<LeadField, string>>;
      /** What the visitor typed, so the form keeps it after a failed submit. */
      values: Partial<Record<LeadField, string>>;
    };

/** Per IP: this many enquiries per window. Generous for a family sharing a connection, useless for spam. */
const RATE_LIMIT = { max: 5, window: '10 minutes' } as const;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
}

/** True while this visitor is under the limit. Fails open if the check itself errors, so leads are never lost. */
async function withinRateLimit(): Promise<boolean> {
  const key = createHash('sha256')
    .update(`lead:${await clientIp()}`)
    .digest('hex');
  const { data, error } = await createSupabaseAdminClient().rpc('take_lead_rate_limit', {
    p_key: key,
    p_max: RATE_LIMIT.max,
    p_window: RATE_LIMIT.window,
  });
  if (error) {
    console.error('Lead rate limit check failed', { code: error.code, message: error.message });
    return true;
  }
  return data === true;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function submitLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const values = {
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    email: text(formData, 'email'),
    preferredTime: text(formData, 'preferredTime'),
    message: text(formData, 'message'),
  };

  // Honeypot filled in: a bot. Look successful so it moves on, save nothing.
  if (text(formData, HONEYPOT_FIELD)) return { status: 'success', name: values.name.trim() };

  const carSlug = text(formData, 'carSlug');
  const parsed = leadSchema.safeParse({ ...values, carSlug: carSlug || undefined });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: 'error',
      error: 'Please check the highlighted fields.',
      fieldErrors: {
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
        email: fieldErrors.email?.[0],
        preferredTime: fieldErrors.preferredTime?.[0],
        message: fieldErrors.message?.[0],
      },
      values,
    };
  }

  if (!(await withinRateLimit())) {
    return {
      status: 'error',
      error: "You've sent several enquiries in a short time. Please wait a few minutes, or call or WhatsApp us.",
      values,
    };
  }

  const lead = parsed.data;
  // Attach the car from its slug. A car that has just been sold is dropped
  // (RLS only allows available cars) but the enquiry is still saved.
  const car = lead.carSlug ? await getPublicCarBySlug(lead.carSlug) : null;
  const message =
    lead.carSlug && !car
      ? [`(Enquiry from /cars/${lead.carSlug})`, lead.message].filter(Boolean).join('\n')
      : lead.message;

  // Anon has INSERT but no SELECT on leads, so no .select() here.
  const insert = (carId: string | null, note?: string) =>
    createSupabasePublicClient()
      .from('leads')
      .insert({
        car_id: carId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? null,
        preferred_time: lead.preferredTime ?? null,
        message: [note, message].filter(Boolean).join('\n').slice(0, 2000) || null,
        source: carId ? 'car_detail' : 'website',
      });

  let { error } = await insert(car?.id ?? null);
  // RLS rejects a car that stopped being available after it was cached.
  if (error?.code === '42501' && car) {
    ({ error } = await insert(null, `(Enquiry from /cars/${car.slug})`));
  }
  if (error) {
    console.error('Lead insert failed', { code: error.code, message: error.message });
    return { status: 'error', error: 'Could not send your enquiry. Please try again, or call or WhatsApp us.', values };
  }

  // Owner email (only if configured), after the response so the visitor never waits for it.
  after(async () => {
    const { dealershipName } = await getSiteSettings();
    await sendNewLeadEmail({
      dealershipName,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      preferredTime: lead.preferredTime,
      message,
      car: car ? { title: [car.title, car.variant].filter(Boolean).join(' '), slug: car.slug } : null,
    });
  });

  // New-lead count in the admin sidebar and overview.
  revalidatePath('/admin', 'layout');
  return { status: 'success', name: lead.name };
}
