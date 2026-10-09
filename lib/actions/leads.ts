'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { CALL_WHEN, followUpForChoice, isPickableDate } from '@/lib/follow-up';
import { formatDate } from '@/lib/format';
import { sendNewLeadEmail } from '@/lib/notifications/lead-email';
import { getPublicCarBySlug } from '@/lib/queries/car-detail';
import { getSiteSettings } from '@/lib/queries/settings';
import { withinRateLimit } from '@/lib/rate-limit';
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
    callWhen: text(formData, 'callWhen'),
    callDate: text(formData, 'callDate'),
    city: text(formData, 'city'),
    budgetRange: text(formData, 'budgetRange'),
    bodyType: text(formData, 'bodyType'),
    timeline: text(formData, 'timeline'),
    exchange: text(formData, 'exchange'),
  };

  // Honeypot filled in: a bot. Look successful so it moves on, save nothing.
  if (text(formData, HONEYPOT_FIELD)) {
    console.warn('Lead dropped by the spam trap (honeypot field was filled)');
    return { status: 'success', name: values.name.trim() };
  }

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
        callWhen: fieldErrors.callWhen?.[0],
        callDate: fieldErrors.callDate?.[0],
        city: fieldErrors.city?.[0],
        budgetRange: fieldErrors.budgetRange?.[0],
        bodyType: fieldErrors.bodyType?.[0],
        timeline: fieldErrors.timeline?.[0],
        exchange: fieldErrors.exchange?.[0],
      },
      values,
    };
  }

  // "When should we call you?" becomes a follow-up time for staff (Asia/Kolkata).
  const now = Date.now();
  const { callWhen, callDate } = parsed.data;
  if (callWhen === 'pick' && !(callDate && isPickableDate(callDate, now))) {
    return {
      status: 'error',
      error: 'Please check the highlighted fields.',
      fieldErrors: { callDate: 'Choose a date from today up to two months ahead.' },
      values,
    };
  }
  const followUpAt = callWhen ? followUpForChoice(callWhen, now, callDate) : null;
  const followUpNote = callWhen
    ? `Customer asked: ${callWhen === 'pick' && followUpAt ? formatDate(followUpAt) : CALL_WHEN[callWhen]}`
    : null;

  if (!(await withinRateLimit('lead', RATE_LIMIT))) {
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
        follow_up_at: followUpAt?.toISOString() ?? null,
        follow_up_note: followUpNote,
        city: lead.city ?? null,
        budget_range: lead.budgetRange ?? null,
        preferred_body_type: lead.bodyType ?? null,
        buying_timeline: lead.timeline ?? null,
        has_exchange: lead.exchange ?? null,
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
