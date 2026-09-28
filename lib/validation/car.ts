import { z } from 'zod';
import { BODY_TYPES, CAR_STATUSES, FUEL_TYPES, MIN_CAR_YEAR, TRANSMISSIONS } from '@/lib/car-options';
import { isPublicStatus } from '@/lib/car-status';

/**
 * Add/Edit car. Shared by the form (inline errors before submitting) and the
 * saveCar server action (the real check). Messages are written for
 * non-technical staff.
 */

export const MAX_PHOTOS = 40;
export const MAX_FEATURES = 60;
export const MAX_PRICE = 1_000_000_000; // ₹100 crore

/** Latest model year staff can pick: next year's models go on sale early. */
export function maxCarYear(now = new Date()) {
  return now.getFullYear() + 1;
}

/** Empty text becomes null so optional columns are cleared, not set to "". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} can be at most ${max} characters.` })
    .transform((v) => (v === '' ? null : v));

export const photoPathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/, { error: 'Invalid photo.' });

export const carSaveSchema = z
  .object({
    id: z.uuid(),
    /** Status after saving. The same as the current status means "save changes". */
    status: z.enum(CAR_STATUSES),
    brandId: z.uuid({ error: 'Choose a brand.' }),
    modelId: z.uuid({ error: 'Choose a model.' }),
    variant: optionalText(80, 'Variant'),
    price: z
      .int({ error: 'Enter the selling price in rupees.' })
      .positive({ error: 'Enter the selling price in rupees.' })
      .max(MAX_PRICE, { error: 'That price looks too high. Check the number of zeros.' }),
    originalPrice: z
      .int({ error: 'Enter the original price in rupees, or leave it empty.' })
      .positive({ error: 'Enter the original price in rupees, or leave it empty.' })
      .max(MAX_PRICE, { error: 'That price looks too high. Check the number of zeros.' })
      .nullable(),
    year: z
      .int({ error: 'Choose the year.' })
      .min(MIN_CAR_YEAR, { error: 'Choose the year.' })
      .refine((y) => y <= maxCarYear(), { error: 'Choose the year.' }),
    kmsDriven: z
      .int({ error: 'Enter the kilometres driven.' })
      .min(0, { error: 'Enter the kilometres driven.' })
      .max(2_000_000, { error: 'That reading looks too high. Check the number of zeros.' }),
    fuelType: z.enum(FUEL_TYPES, { error: 'Choose the fuel type.' }),
    transmission: z.enum(TRANSMISSIONS, { error: 'Choose the transmission.' }),
    bodyType: z.enum(BODY_TYPES, { error: 'Choose the body type.' }),
    engineCc: z
      .int({ error: 'Enter the engine size in cc, or leave it empty.' })
      .min(50, { error: 'Enter the engine size in cc (for example 1197).' })
      .max(10_000, { error: 'Enter the engine size in cc (for example 1197).' })
      .nullable(),
    owners: z
      .int()
      .min(1, { error: 'Choose the number of owners.' })
      .max(10, { error: 'Choose the number of owners.' }),
    color: optionalText(40, 'Colour'),
    registrationState: optionalText(40, 'State'),
    registrationCity: optionalText(60, 'City'),
    description: optionalText(5000, 'Description'),
    featured: z.boolean(),
    features: z
      .array(z.string().trim().min(1).max(60, { error: 'Keep each feature under 60 characters.' }))
      .max(MAX_FEATURES, { error: `Choose at most ${MAX_FEATURES} features.` })
      .transform((list) => {
        // Case-insensitive de-duplication, keeping the first spelling.
        const seen = new Set<string>();
        return list.filter((f) => {
          const key = f.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }),
    /** Storage paths in display order; the first is the cover photo. */
    photos: z.array(photoPathSchema).max(MAX_PHOTOS, { error: `Add at most ${MAX_PHOTOS} photos.` }),
  })
  .superRefine((car, ctx) => {
    if (car.originalPrice !== null && car.originalPrice <= car.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['originalPrice'],
        message: 'The original price should be higher than the selling price. Leave it empty if unsure.',
      });
    }
    if (car.photos.some((p) => !p.startsWith(`${car.id}/`))) {
      ctx.addIssue({ code: 'custom', path: ['photos'], message: 'One of the photos belongs to another car.' });
    }
    if (new Set(car.photos).size !== car.photos.length) {
      ctx.addIssue({ code: 'custom', path: ['photos'], message: 'A photo is listed twice.' });
    }
    if (isPublicStatus(car.status) && car.photos.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['photos'], message: 'Add at least one photo before publishing.' });
    }
  });

export type CarSaveInput = z.input<typeof carSaveSchema>;
export type CarSaveData = z.output<typeof carSaveSchema>;
export type CarField = keyof CarSaveInput;
export type CarFieldErrors = Partial<Record<CarField, string>>;

/** First message per field, in a shape the form can show inline. */
export function carFieldErrors(error: z.ZodError): CarFieldErrors {
  const out: CarFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as CarField | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

export const newModelSchema = z.object({
  brandId: z.uuid({ error: 'Choose a brand first.' }),
  name: z
    .string()
    .trim()
    .min(1, { error: 'Enter the model name.' })
    .max(60, { error: 'Keep the model name under 60 characters.' })
    .regex(/[a-z0-9]/i, { error: 'Enter the model name.' }),
});

export const newBrandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Enter the brand name.' })
    .max(60, { error: 'Keep the brand name under 60 characters.' })
    .regex(/[a-z0-9]/i, { error: 'Enter the brand name.' }),
});

export const carIdSchema = z.uuid();

// ---------------------------------------------------------------------------
// Photo files (checked in the browser before compressing; the bucket also
// enforces type and a 10 MB limit on what is actually uploaded)
// ---------------------------------------------------------------------------

export const PHOTO_INPUT_MAX_BYTES = 30 * 1024 * 1024;
export const PHOTO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

/** HEIC files often arrive with an empty MIME type, so the extension counts too. */
export function isHeicFile(file: { name: string; type: string }) {
  return /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export const photoFileSchema = z
  .object({ name: z.string(), type: z.string(), size: z.number() })
  .refine((f) => PHOTO_TYPES.includes(f.type) || (f.type === '' && PHOTO_EXTENSIONS.test(f.name)), {
    error: 'Only JPG, PNG, WebP or HEIC photos can be added.',
  })
  .refine((f) => f.size > 0, { error: 'This file is empty.' })
  .refine((f) => f.size <= PHOTO_INPUT_MAX_BYTES, {
    error: `This photo is over ${PHOTO_INPUT_MAX_BYTES / 1024 / 1024} MB.`,
  });

/** The compressed file just before upload. */
export const preparedPhotoSchema = z.object({
  type: z.literal('image/webp', { error: 'The photo could not be converted.' }),
  size: z.number().max(PHOTO_UPLOAD_MAX_BYTES, { error: 'The photo is still too large after compressing.' }),
});
