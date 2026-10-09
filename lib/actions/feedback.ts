'use server';

import { revalidatePath } from 'next/cache';
import { withinRateLimit } from '@/lib/rate-limit';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { feedbackSchema, type FeedbackField } from '@/lib/validation/feedback';
import { HONEYPOT_FIELD } from '@/lib/validation/lead';

// The public feedback popup. Visitors are anonymous: input is validated and
// rate-limited per IP, and anon may only INSERT into site_feedback.

const RATE_LIMIT = { max: 3, window: '1 hour' } as const;

export type FeedbackResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<FeedbackField, string>> };

export async function submitFeedback(raw: Record<string, unknown>): Promise<FeedbackResult> {
  // Honeypot filled in: a bot. Look successful so it moves on, save nothing.
  if (typeof raw?.[HONEYPOT_FIELD] === 'string' && raw[HONEYPOT_FIELD]) {
    console.warn('Feedback dropped by the spam trap (honeypot field was filled)');
    return { ok: true };
  }

  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<FeedbackField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'rating' || key === 'comment' || key === 'phone') && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
  }

  if (!(await withinRateLimit('feedback', RATE_LIMIT))) {
    return { ok: false, error: 'Thanks, we already have your feedback.' };
  }

  const { rating, comment, phone, pageUrl } = parsed.data;
  // Anon has INSERT but no SELECT on site_feedback, so no .select() here.
  const { error } = await createSupabasePublicClient()
    .from('site_feedback')
    .insert({ rating, comment, phone, page_url: pageUrl });
  if (error) {
    console.error('Feedback insert failed', { code: error.code, message: error.message });
    return { ok: false, error: 'Could not send your feedback. Please try again.' };
  }

  revalidatePath('/admin/feedback');
  return { ok: true };
}
