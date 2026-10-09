import { z } from 'zod';
import { normaliseIndianMobile } from '@/lib/validation/lead';

/**
 * The feedback popup (components/feedback). Shared by the popup and the
 * server action. Limits match the site_feedback table checks.
 */

export const FEEDBACK_RATINGS = [
  { value: 1, emoji: '😞', label: 'Poor' },
  { value: 2, emoji: '🙁', label: 'Fair' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😍', label: 'Great' },
] as const;

/** Popup delay limits, in minutes, as staff set them in /admin/settings. */
export const FEEDBACK_DELAY_MINUTES = { min: 1, max: 60, default: 5 } as const;

/** After the popup has been shown, closed or answered, it stays away this long. */
export const FEEDBACK_SNOOZE_DAYS = 30;

export const feedbackSchema = z.object({
  rating: z.coerce
    .number({ error: 'Choose a rating.' })
    .int()
    .min(1, { error: 'Choose a rating.' })
    .max(5, { error: 'Choose a rating.' }),
  comment: z
    .string()
    .trim()
    .max(1000, { error: 'Keep your comment under 1,000 characters.' })
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const phone = normaliseIndianMobile(v);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number, or leave it empty.' });
        return z.NEVER;
      }
      return phone;
    }),
  /** The path the visitor was on. Anything else (a full URL, junk) is dropped, not rejected. */
  pageUrl: z
    .string()
    .catch('')
    .transform((v) => (/^\/[^\s]{0,299}$/.test(v) && !v.startsWith('//') ? v : null)),
});

export type FeedbackInput = z.input<typeof feedbackSchema>;
export type FeedbackField = 'rating' | 'comment' | 'phone';
