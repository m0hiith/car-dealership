import { z } from 'zod';
import { isSiteMediaPath, type SiteMediaKind } from '@/lib/site-media';
import { normaliseIndianMobile } from '@/lib/validation/lead';
import { parseVideoUrl } from '@/lib/video';

/**
 * Homepage content, site settings and testimonials (/admin/content,
 * /admin/settings, /admin/testimonials). Shared by the forms and the server
 * actions. Messages are written for non-technical staff.
 */

/** Empty text becomes null so optional columns are cleared, not set to "". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} can be at most ${max.toLocaleString('en-IN')} characters.` })
    .transform((v) => (v === '' ? null : v));

const requiredText = (max: number, label: string, missing: string) =>
  z
    .string()
    .trim()
    .min(1, { error: missing })
    .max(max, { error: `${label} can be at most ${max.toLocaleString('en-IN')} characters.` });

const httpsUrl = (max: number, message: string) =>
  optionalText(max, 'This link').refine(
    (v) => {
      if (v === null) return true;
      try {
        return new URL(v).protocol === 'https:';
      } catch {
        return false;
      }
    },
    { error: message },
  );

/**
 * What to do with an uploaded file on save: keep the current one, remove it,
 * or use a file just uploaded to site-media (the server picked its path).
 */
export const mediaChangeSchema = (kind: SiteMediaKind) =>
  z.union([
    z.literal('keep'),
    z.literal('remove'),
    z.object({ path: z.string().refine((p) => isSiteMediaPath(p, kind), { error: 'Invalid file. Upload it again.' }) }),
  ]);

export type MediaChange = 'keep' | 'remove' | { path: string };

// ---------------------------------------------------------------------------
// Homepage content
// ---------------------------------------------------------------------------

export const MAX_WHY_US_ITEMS = 8;

/** A path on this site ("/cars?fuel=diesel") or a full https link. */
const ctaLinkSchema = optionalText(300, 'The button link').refine(
  (v) => {
    if (v === null) return true;
    if (/^\/(?!\/)\S*$/.test(v)) return true;
    try {
      return new URL(v).protocol === 'https:';
    } catch {
      return false;
    }
  },
  { error: 'Use a page on this site such as /cars, or a full link starting with https://' },
);

export const whyUsItemSchema = z.object({
  title: requiredText(60, 'The heading', 'Enter a heading, or remove this item.'),
  description: z.string().trim().max(200, { error: 'The text can be at most 200 characters.' }),
});

export type WhyUsItem = z.infer<typeof whyUsItemSchema>;

/** why_us as stored. Bad rows written by hand in the database are skipped, not fatal. */
export function parseWhyUs(value: unknown): WhyUsItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = whyUsItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const homepageContentSchema = z
  .object({
    heroTitle: requiredText(120, 'The headline', 'Enter a headline.'),
    heroDescription: optionalText(400, 'The description'),
    heroMedia: mediaChangeSchema('hero'),
    ctaText: optionalText(40, 'The button text'),
    ctaLink: ctaLinkSchema,
    whyUs: z.array(whyUsItemSchema).max(MAX_WHY_US_ITEMS, { error: `Keep it to ${MAX_WHY_US_ITEMS} items or fewer.` }),
    videoUrl: optionalText(500, 'The video link').refine((v) => v === null || parseVideoUrl(v) !== null, {
      error: 'Paste a YouTube link, or a link to an .mp4 or .webm file starting with https://',
    }),
    aboutTitle: optionalText(120, 'The About page heading'),
    aboutBody: optionalText(5000, 'The About page text'),
  })
  .superRefine((c, ctx) => {
    if (c.ctaText && !c.ctaLink) {
      ctx.addIssue({ code: 'custom', path: ['ctaLink'], message: 'Add where the button goes, e.g. /cars.' });
    }
    if (c.ctaLink && !c.ctaText) {
      ctx.addIssue({ code: 'custom', path: ['ctaText'], message: 'Add the button text, e.g. Browse cars.' });
    }
  });

export type HomepageContentInput = z.input<typeof homepageContentSchema>;

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

export const SOCIAL_NETWORKS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
} as const;
export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

/** socials as stored: only known networks with https links. */
export function parseSocials(value: unknown): SocialLinks {
  const out: SocialLinks = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const key of Object.keys(SOCIAL_NETWORKS) as SocialNetwork[]) {
    const url = (value as Record<string, unknown>)[key];
    if (typeof url === 'string' && url.startsWith('https://')) out[key] = url;
  }
  return out;
}

/** Digits a phone number may be typed with: +91, spaces, dashes, brackets. */
const PHONE_CHARS = /^[+\d\s\-()]+$/;

export const siteSettingsSchema = z.object({
  dealershipName: requiredText(100, 'The name', 'Enter the dealership name.'),
  logo: mediaChangeSchema('logo'),
  phone: optionalText(20, 'The phone number').refine(
    (v) => v === null || (PHONE_CHARS.test(v) && v.replace(/\D/g, '').length >= 10),
    { error: 'Enter a phone number with the area code, e.g. 98765 43210 or 040 1234 5678.' },
  ),
  whatsappNumber: optionalText(20, 'The WhatsApp number').refine((v) => v === null || normaliseIndianMobile(v), {
    error: 'Enter a 10-digit Indian mobile number that has WhatsApp.',
  }),
  address: optionalText(400, 'The address'),
  mapUrl: httpsUrl(500, 'Paste the Google Maps link (it starts with https://).'),
  businessHours: optionalText(200, 'Business hours'),
  socials: z.object({
    instagram: httpsUrl(300, 'Paste the full link, starting with https://'),
    facebook: httpsUrl(300, 'Paste the full link, starting with https://'),
    youtube: httpsUrl(300, 'Paste the full link, starting with https://'),
  }),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export const testimonialSchema = z.object({
  /** Missing for a new testimonial. */
  id: z.uuid().optional(),
  customerName: requiredText(100, 'The name', "Enter the customer's name."),
  review: requiredText(2000, 'The review', 'Enter what the customer said.'),
  rating: z.int({ error: 'Choose a rating.' }).min(1, { error: 'Choose a rating.' }).max(5),
  isPublished: z.boolean(),
  photo: mediaChangeSchema('testimonials'),
});

export type TestimonialInput = z.input<typeof testimonialSchema>;

export const testimonialIdSchema = z.uuid();

// ---------------------------------------------------------------------------
// Uploads and errors
// ---------------------------------------------------------------------------

export const VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_ACCEPT = 'video/mp4,video/webm,.mp4,.webm';

export const videoFileSchema = z
  .object({ name: z.string(), type: z.string(), size: z.number() })
  .refine((f) => f.type === 'video/mp4' || f.type === 'video/webm', { error: 'Only MP4 or WebM videos can be used.' })
  .refine((f) => f.size > 0, { error: 'This file is empty.' })
  .refine((f) => f.size <= VIDEO_UPLOAD_MAX_BYTES, {
    error: `Keep the video under ${VIDEO_UPLOAD_MAX_BYTES / 1024 / 1024} MB. Shorten or compress it first.`,
  });

export const siteMediaUploadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hero'), ext: z.enum(['webp', 'mp4', 'webm']) }),
  z.object({ kind: z.literal('logo'), ext: z.literal('webp') }),
  z.object({ kind: z.literal('testimonials'), ext: z.literal('webp') }),
]);

export type FieldErrors = Record<string, string>;

/** First message per field, keyed by its dotted path ("whyUs.2.title"). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
