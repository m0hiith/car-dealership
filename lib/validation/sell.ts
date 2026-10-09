import { z } from 'zod';
import { FUEL_TYPES, MIN_CAR_YEAR, REGISTRATION_STATES, TRANSMISSIONS } from '@/lib/car-options';
import { PHOTO_UPLOAD_MAX_BYTES } from '@/lib/validation/car';
import { normaliseIndianMobile, PREFERRED_TIMES } from '@/lib/validation/lead';

/**
 * "Sell Your Car" (/sell). One schema for the whole request, shared by the
 * multi-step form (which checks one step's fields at a time) and the server
 * action. Limits match the sell_requests table checks.
 */

export const MAX_SELL_PHOTOS = 8;
export const OTHER = 'other';

/** Where photos are stored in the sell-requests bucket. The server picks every path. */
export const SELL_PHOTO_PATH = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/** The browser asks for an upload URL with what it is about to send; the bucket enforces the same limits. */
export const sellPhotoUploadSchema = z.object({
  type: z.literal('image/webp', { error: 'Only photos can be uploaded.' }),
  size: z
    .number()
    .int()
    .positive({ error: 'This photo is empty.' })
    .max(PHOTO_UPLOAD_MAX_BYTES, { error: 'This photo is too large.' }),
});

const text = (max: number, message: string) => z.string().trim().max(max, { error: message });

/** Empty text becomes null so optional columns stay empty, not "". */
const optionalText = (max: number, message: string) => text(max, message).transform((v) => v || null);

/** Whole numbers typed with commas or spaces ("1,20,000") are fine. */
const wholeNumber = (missing: string, invalid: string) =>
  z
    .string()
    .trim()
    .min(1, { error: missing })
    .transform((v, ctx) => {
      const digits = v.replace(/[,\s]/g, '');
      if (!/^\d{1,10}$/.test(digits)) {
        ctx.addIssue({ code: 'custom', message: invalid });
        return z.NEVER;
      }
      return Number(digits);
    });

const idOrOther = z.union([z.uuid(), z.literal(OTHER)]);

export const sellRequestSchema = z
  .object({
    // Step 1: the car
    brandId: z.union([idOrOther, z.literal('')]),
    brandOther: text(60, 'Keep the brand under 60 characters.'),
    modelId: z.union([idOrOther, z.literal('')]),
    modelOther: text(60, 'Keep the model under 60 characters.'),
    variant: optionalText(100, 'Keep the variant under 100 characters.'),

    // Step 2: details
    year: wholeNumber('Choose the year.', 'Choose the year.').pipe(
      z
        .number()
        .min(MIN_CAR_YEAR, { error: 'Choose the year.' })
        .refine((y) => y <= new Date().getFullYear() + 1, { error: 'Choose the year.' }),
    ),
    kmsDriven: wholeNumber('Enter the kilometres driven.', 'Enter the kilometres as a number, e.g. 45000.').pipe(
      z.number().max(2_000_000, { error: 'Check the kilometres driven.' }),
    ),
    fuelType: z.enum(FUEL_TYPES, { error: 'Choose the fuel type.' }),
    transmission: z.enum(TRANSMISSIONS, { error: 'Choose the transmission.' }),
    owners: z.coerce
      .number({ error: 'Choose the number of owners.' })
      .int()
      .min(1, { error: 'Choose the number of owners.' })
      .max(6, { error: 'Choose the number of owners.' }),

    // Step 3: registration, price, condition
    registrationState: z
      .union([z.enum(REGISTRATION_STATES as [string, ...string[]]), z.literal('')])
      .transform((v) => v || null),
    registrationCity: optionalText(60, 'Keep the city under 60 characters.'),
    expectedPrice: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (!v) return null;
        const digits = v.replace(/[,\s₹]/g, '');
        if (!/^\d{1,10}$/.test(digits) || Number(digits) < 1 || Number(digits) > 1_000_000_000) {
          ctx.addIssue({ code: 'custom', message: 'Enter the price in rupees, e.g. 550000, or leave it empty.' });
          return z.NEVER;
        }
        return Number(digits);
      }),
    conditionNotes: optionalText(2000, 'Keep the notes under 2,000 characters.'),

    // Step 4: photos (already uploaded; only their paths are sent)
    photoPaths: z
      .array(z.string().regex(SELL_PHOTO_PATH, { error: 'A photo did not upload. Remove it and add it again.' }))
      .max(MAX_SELL_PHOTOS, { error: `Add up to ${MAX_SELL_PHOTOS} photos.` })
      .refine((paths) => new Set(paths).size === paths.length, { error: 'A photo was added twice.' }),

    // Step 5: contact
    name: text(100, 'Keep your name under 100 characters.').min(1, { error: 'Enter your name.' }),
    phone: z
      .string()
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
    preferredTime: z.union([z.enum(PREFERRED_TIMES), z.literal('')]).transform((v) => v || null),
  })
  .superRefine((r, ctx) => {
    if (!r.brandId) ctx.addIssue({ code: 'custom', path: ['brandId'], message: 'Choose the brand.' });
    if (r.brandId === OTHER && !r.brandOther) {
      ctx.addIssue({ code: 'custom', path: ['brandOther'], message: 'Type the brand.' });
    }
    // A brand that is not in the list has no listed models either.
    const modelIsOther = r.brandId === OTHER || r.modelId === OTHER;
    if (r.brandId && r.brandId !== OTHER && !r.modelId) {
      ctx.addIssue({ code: 'custom', path: ['modelId'], message: 'Choose the model.' });
    }
    if (modelIsOther && !r.modelOther) {
      ctx.addIssue({ code: 'custom', path: ['modelOther'], message: 'Type the model.' });
    }
  });

export type SellRequestInput = z.input<typeof sellRequestSchema>;
export type SellRequest = z.output<typeof sellRequestSchema>;
export type SellField = keyof SellRequestInput;

/** The fields each step of the form owns, in order. */
export const SELL_STEPS: { title: string; fields: SellField[] }[] = [
  { title: 'Your car', fields: ['brandId', 'brandOther', 'modelId', 'modelOther', 'variant'] },
  { title: 'Details', fields: ['year', 'kmsDriven', 'fuelType', 'transmission', 'owners'] },
  {
    title: 'Registration and price',
    fields: ['registrationState', 'registrationCity', 'expectedPrice', 'conditionNotes'],
  },
  { title: 'Photos', fields: ['photoPaths'] },
  { title: 'Your details', fields: ['name', 'phone', 'preferredTime'] },
];

/** First message per field. */
export function sellFieldErrors(error: z.ZodError): Partial<Record<SellField, string>> {
  const out: Partial<Record<SellField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as SellField | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
