import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

/**
 * Public enquiry form (PRODUCT_SPEC §5.7). Shared by the form and the
 * server action. Limits match the leads table checks.
 */

export const PREFERRED_TIMES = [
  'Morning (9 AM – 12 PM)',
  'Afternoon (12 – 4 PM)',
  'Evening (4 – 8 PM)',
  'Any time',
] as const;

/** Name of the hidden honeypot input. People never see or fill it; bots tend to. */
export const HONEYPOT_FIELD = 'company_website';

/**
 * Indian mobile number as stored in leads.phone: 10 digits starting 6–9.
 * Accepts spaces, dashes, brackets, a leading 0 or +91 / 91.
 */
export function normaliseIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Empty strings from the form become undefined. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((v) => v || undefined)
    .optional();

export const leadSchema = z.object({
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(100, { error: 'Keep your name under 100 characters.' }),
  phone: z
    .string({ error: 'Enter your mobile number.' })
    .trim()
    .min(1, { error: 'Enter your mobile number.' })
    .transform((v, ctx) => {
      const phone = normaliseIndianMobile(v);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number.' });
        return z.NEVER;
      }
      return phone;
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, { error: 'Enter a valid email address.' })
    .transform((v) => v || undefined)
    .pipe(z.email({ error: 'Enter a valid email address.' }).optional())
    .optional(),
  preferredTime: z
    .union([z.enum(PREFERRED_TIMES), z.literal('')])
    .transform((v) => v || undefined)
    .optional(),
  message: optionalText(2000, 'Keep your message under 2,000 characters.'),
  carSlug: z.string().max(120).regex(SLUG_PATTERN).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadField = 'name' | 'phone' | 'email' | 'preferredTime' | 'message';
