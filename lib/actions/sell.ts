'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { sendNewSellRequestEmail } from '@/lib/notifications/sell-request-email';
import { getSiteSettings } from '@/lib/queries/settings';
import { withinRateLimit } from '@/lib/rate-limit';
import { removeAbandonedSellPhotos } from '@/lib/sell-photo-cleanup';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { PHOTO_UPLOAD_MAX_BYTES } from '@/lib/validation/car';
import { HONEYPOT_FIELD } from '@/lib/validation/lead';
import {
  OTHER,
  SELL_PHOTO_PATH,
  sellFieldErrors,
  sellPhotoUploadSchema,
  sellRequestSchema,
  type SellField,
} from '@/lib/validation/sell';

// Public "Sell Your Car" form (/sell). Visitors are anonymous, so every
// action validates its input, and both photo uploads and submissions are
// rate-limited per IP. Photos go to the private sell-requests bucket
// through server-issued signed URLs; the bucket only accepts WebP up to
// 10 MB, and submit re-checks each file before saving. Uploads nobody sent
// are removed later by lib/sell-photo-cleanup.ts.

const BUCKET = 'sell-requests';
/** Per IP. A full form is at most 8 photos; this allows retries and a second car. */
const UPLOAD_LIMIT = { max: 30, window: '1 hour' } as const;
const SUBMIT_LIMIT = { max: 3, window: '10 minutes' } as const;

export type SellPhotoUploadTarget = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/** A one-time URL the browser uploads one compressed photo to. */
export async function createSellPhotoUpload(raw: { type: string; size: number }): Promise<SellPhotoUploadTarget> {
  const parsed = sellPhotoUploadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'This photo cannot be uploaded.' };
  if (!(await withinRateLimit('sell-upload', UPLOAD_LIMIT))) {
    return { ok: false, error: 'Too many photos in a short time. Please wait a while and try again.' };
  }

  const path = `uploads/${randomUUID()}.webp`;
  const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('createSellPhotoUpload failed', { message: error?.message });
    return { ok: false, error: 'Could not start the upload. Please try again.' };
  }
  return { ok: true, path, signedUrl: data.signedUrl };
}

/** Removes a photo the visitor took out of the form, unless a sent request already uses it. */
export async function discardSellPhoto(path: string): Promise<void> {
  if (typeof path !== 'string' || !SELL_PHOTO_PATH.test(path)) return;
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from('sell_requests')
    .select('id', { count: 'exact', head: true })
    .contains('photo_paths', [path]);
  if (error || (count ?? 0) > 0) return;
  await admin.storage.from(BUCKET).remove([path]);
}

/** Every photo must exist in the bucket as a WebP within the size limit. */
async function photosAreValid(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const storage = createSupabaseAdminClient().storage.from(BUCKET);
  const results = await Promise.all(paths.map((path) => storage.info(path)));
  return results.every(
    ({ data }) =>
      data !== null &&
      data.contentType === 'image/webp' &&
      (data.size ?? 0) > 0 &&
      (data.size ?? 0) <= PHOTO_UPLOAD_MAX_BYTES,
  );
}

export type SellSubmitResult =
  | { ok: true; name: string; car: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<SellField, string>> };

export async function submitSellRequest(raw: Record<string, unknown>): Promise<SellSubmitResult> {
  const parsed = sellRequestSchema.safeParse(raw);
  // Honeypot filled in: a bot. Look successful so it moves on, save nothing.
  if (typeof raw?.[HONEYPOT_FIELD] === 'string' && raw[HONEYPOT_FIELD]) {
    console.warn('Sell request dropped by the spam trap (honeypot field was filled)');
    return { ok: true, name: parsed.success ? parsed.data.name : '', car: '' };
  }
  if (!parsed.success) {
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors: sellFieldErrors(parsed.error) };
  }
  const r = parsed.data;

  if (!(await withinRateLimit('sell', SUBMIT_LIMIT))) {
    return {
      ok: false,
      error: "You've sent several requests in a short time. Please wait a few minutes, or call or WhatsApp us.",
    };
  }

  // Resolve the picked brand and model; typed "Other" names are taken as they are.
  const supabase = createSupabasePublicClient();
  let brand = { id: null as string | null, name: r.brandOther };
  let model = { id: null as string | null, name: r.modelOther };
  if (r.brandId !== OTHER) {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', r.brandId)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) {
      return { ok: false, error: 'Please choose the brand again.', fieldErrors: { brandId: 'Choose the brand.' } };
    }
    brand = { id: data.id, name: data.name };
    if (r.modelId !== OTHER) {
      const { data: m, error: mError } = await supabase
        .from('models')
        .select('id, name')
        .eq('id', r.modelId)
        .eq('brand_id', data.id)
        .eq('is_active', true)
        .maybeSingle();
      if (mError || !m) {
        return { ok: false, error: 'Please choose the model again.', fieldErrors: { modelId: 'Choose the model.' } };
      }
      model = { id: m.id, name: m.name };
    }
  }

  if (!(await photosAreValid(r.photoPaths))) {
    return {
      ok: false,
      error: 'One of your photos did not upload properly. Go back to Photos, remove it and add it again.',
      fieldErrors: { photoPaths: 'Remove the photo that failed and add it again.' },
    };
  }

  // Anon has INSERT but no SELECT on sell_requests, so no .select() here.
  const { error } = await supabase.from('sell_requests').insert({
    brand_id: brand.id,
    model_id: model.id,
    brand_name: brand.name,
    model_name: model.name,
    variant: r.variant,
    year: r.year,
    kms_driven: r.kmsDriven,
    fuel_type: r.fuelType,
    transmission: r.transmission,
    owners: r.owners,
    registration_state: r.registrationState,
    registration_city: r.registrationCity,
    expected_price: r.expectedPrice,
    condition_notes: r.conditionNotes,
    photo_paths: r.photoPaths,
    name: r.name,
    phone: r.phone,
    preferred_time: r.preferredTime,
  });
  if (error) {
    console.error('Sell request insert failed', { code: error.code, message: error.message });
    return { ok: false, error: 'Could not send your request. Please try again, or call or WhatsApp us.' };
  }

  const car = [r.year, brand.name, model.name].join(' ');

  // After the response, so the visitor never waits: the owner email (only if
  // configured) and a sweep of photos other visitors uploaded but never sent.
  after(async () => {
    const { dealershipName } = await getSiteSettings();
    await sendNewSellRequestEmail({
      dealershipName,
      car,
      variant: r.variant,
      kmsDriven: r.kmsDriven,
      fuelType: r.fuelType,
      transmission: r.transmission,
      owners: r.owners,
      registration: [r.registrationState, r.registrationCity].filter(Boolean).join(', ') || null,
      expectedPrice: r.expectedPrice,
      conditionNotes: r.conditionNotes,
      photoCount: r.photoPaths.length,
      name: r.name,
      phone: r.phone,
      preferredTime: r.preferredTime,
    });
    await removeAbandonedSellPhotos();
  });

  // New-request count in the admin sidebar and overview.
  revalidatePath('/admin', 'layout');
  return { ok: true, name: r.name, car };
}
