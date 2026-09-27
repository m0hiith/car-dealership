'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { CarStatus } from '@/lib/car-options';
import { canMoveTo } from '@/lib/car-status';
import { slugify, withSlugSuffix } from '@/lib/slug';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  carFieldErrors,
  carIdSchema,
  carSaveSchema,
  newModelSchema,
  photoPathSchema,
  slugCheckSchema,
  type CarFieldErrors,
} from '@/lib/validation/car';

// Every action re-checks admin access (CLAUDE.md §5) and runs as the
// signed-in user, so RLS applies on top.

const BUCKET = 'car-images';
/** Uploads older than this that no saved car uses are treated as abandoned. */
const ORPHAN_AGE_MS = 6 * 60 * 60 * 1000;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// ---------------------------------------------------------------------------
// Save (create or update, optionally changing status)
// ---------------------------------------------------------------------------

export type SaveCarResult =
  | { ok: true; id: string; slug: string; status: CarStatus; created: boolean }
  | { ok: false; error: string; fieldErrors?: CarFieldErrors };

export async function saveCar(raw: unknown): Promise<SaveCarResult> {
  await requireAdmin();

  const parsed = carSaveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: carFieldErrors(parsed.error) };
  }
  const car = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: current, error: loadError } = await supabase
    .from('cars')
    .select('status, slug')
    .eq('id', car.id)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };

  if (!canMoveTo(current?.status ?? null, car.status)) {
    return { ok: false, error: 'That status change is not allowed. Reload the page and try again.' };
  }

  let slug = car.slug;
  if (car.slugAuto) {
    slug = await findFreeSlug(supabase, car.slug, car.id);
  } else if (!(await isSlugFree(supabase, car.slug, car.id))) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: { slug: 'Another car already uses this web address. Change it slightly, e.g. add "-2".' },
    };
  }

  const { url } = getSupabasePublicEnv();
  const { data: removed, error } = await supabase.rpc('save_car', {
    p_car_id: car.id,
    p_car: {
      brand_id: car.brandId,
      model_id: car.modelId,
      variant: car.variant,
      slug,
      price: car.price,
      original_price: car.originalPrice,
      year: car.year,
      kms_driven: car.kmsDriven,
      fuel_type: car.fuelType,
      transmission: car.transmission,
      body_type: car.bodyType,
      engine_cc: car.engineCc,
      owners: car.owners,
      color: car.color,
      registration_state: car.registrationState,
      registration_city: car.registrationCity,
      description: car.description,
      status: car.status,
      featured: car.featured,
    },
    p_features: car.features,
    p_photos: car.photos,
    p_photo_base_url: `${url}/storage/v1/object/public/${BUCKET}`,
  });

  if (error) {
    if (error.code === '23505' && error.message.includes('cars_slug_key')) {
      return {
        ok: false,
        error: 'Please fix the highlighted fields.',
        fieldErrors: { slug: 'Another car already uses this web address.' },
      };
    }
    if (error.hint === 'car_needs_photo') {
      return {
        ok: false,
        error: 'Please fix the highlighted fields.',
        fieldErrors: { photos: 'Add at least one photo before publishing.' },
      };
    }
    if (error.code === '23503') {
      return {
        ok: false,
        error: 'Please fix the highlighted fields.',
        fieldErrors: { modelId: 'Choose a model from this brand.' },
      };
    }
    console.error('save_car failed', { carId: car.id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save the car. Please try again.' };
  }

  await removeUnusedPhotos(supabase, car.id, car.photos, removed ?? []);

  updateTag(CACHE_TAGS.cars);
  updateTag(CACHE_TAGS.car(slug));
  if (current && current.slug !== slug) updateTag(CACHE_TAGS.car(current.slug));
  revalidatePath('/admin', 'layout');

  return { ok: true, id: car.id, slug, status: car.status, created: !current };
}

async function isSlugFree(supabase: Client, slug: string, carId: string) {
  const { count, error } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .neq('id', carId);
  if (error) throw new Error(`Could not check the web address: ${error.message}`);
  return count === 0;
}

/** The slug itself if free, otherwise the first free "-2", "-3", ... */
async function findFreeSlug(supabase: Client, slug: string, carId: string) {
  const { data, error } = await supabase.from('cars').select('slug').like('slug', `${slug}%`).neq('id', carId);
  if (error) throw new Error(`Could not check the web address: ${error.message}`);
  const taken = new Set(data.map((c) => c.slug));
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n++) {
    const candidate = withSlugSuffix(slug, n);
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Deletes files for photos this save removed, plus abandoned uploads in the
 * car's folder (added in a form that was never saved). Best effort: a
 * leftover file costs a little storage but never shows on the site.
 */
async function removeUnusedPhotos(supabase: Client, carId: string, keep: string[], removed: string[]) {
  const storage = supabase.storage.from(BUCKET);
  const keepSet = new Set(keep);
  const toDelete = new Set(removed.filter((p) => !keepSet.has(p)));

  const { data: files } = await storage.list(carId, { limit: 1000 });
  const cutoff = Date.now() - ORPHAN_AGE_MS;
  for (const file of files ?? []) {
    const path = `${carId}/${file.name}`;
    const created = file.created_at ? Date.parse(file.created_at) : Number.NaN;
    if (!keepSet.has(path) && created < cutoff) toDelete.add(path);
  }

  if (toDelete.size > 0) {
    const { error } = await storage.remove([...toDelete]);
    if (error) console.error('Could not delete unused car photos', { carId, message: error.message });
  }
}

// ---------------------------------------------------------------------------
// Slug availability (live check while typing)
// ---------------------------------------------------------------------------

export async function checkCarSlug(raw: { slug: string; carId: string }): Promise<{ available: boolean }> {
  await requireAdmin();
  const parsed = slugCheckSchema.safeParse(raw);
  if (!parsed.success) return { available: false };
  const supabase = await createSupabaseServerClient();
  return { available: await isSlugFree(supabase, parsed.data.slug, parsed.data.carId) };
}

// ---------------------------------------------------------------------------
// Add a model inline
// ---------------------------------------------------------------------------

export type CreateModelResult =
  { ok: true; model: { id: string; brandId: string; name: string; isActive: boolean } } | { ok: false; error: string };

export async function createModel(raw: { brandId: string; name: string }): Promise<CreateModelResult> {
  await requireAdmin();
  const parsed = newModelSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter the model name.' };

  const { brandId } = parsed.data;
  const name = parsed.data.name.replace(/\s+/g, ' ');
  const slug = slugify(name);
  const supabase = await createSupabaseServerClient();

  // Reuse the existing model if someone already added it (maybe spelt differently).
  const existing = await supabase
    .from('models')
    .select('id, brand_id, name, is_active')
    .eq('brand_id', brandId)
    .eq('slug', slug)
    .maybeSingle();
  if (existing.error) return { ok: false, error: 'Could not add the model. Please try again.' };

  let model = existing.data;
  if (!model) {
    const inserted = await supabase
      .from('models')
      .insert({ brand_id: brandId, name, slug })
      .select('id, brand_id, name, is_active')
      .single();
    if (inserted.error) return { ok: false, error: 'Could not add the model. Please try again.' };
    model = inserted.data;
  } else if (!model.is_active) {
    const reactivated = await supabase
      .from('models')
      .update({ is_active: true })
      .eq('id', model.id)
      .select('id, brand_id, name, is_active')
      .single();
    if (reactivated.error) return { ok: false, error: 'Could not add the model. Please try again.' };
    model = reactivated.data;
  }

  updateTag(CACHE_TAGS.brands);
  return { ok: true, model: { id: model.id, brandId: model.brand_id, name: model.name, isActive: model.is_active } };
}

// ---------------------------------------------------------------------------
// Photo uploads
// ---------------------------------------------------------------------------

export type PhotoUploadTarget = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/**
 * A one-time URL the browser uploads one compressed photo to, so the upload
 * can report progress. The server picks the path: car-images/{car_id}/{uuid}.webp.
 */
export async function createCarPhotoUpload(carId: string): Promise<PhotoUploadTarget> {
  await requireAdmin();
  const id = carIdSchema.safeParse(carId);
  if (!id.success) return { ok: false, error: 'Invalid car.' };

  const path = `${id.data}/${randomUUID()}.webp`;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload. Please try again.' };
  return { ok: true, path, signedUrl: data.signedUrl };
}

/**
 * Deletes a photo that was uploaded in this form session but never saved.
 * Photos a saved car already uses are left alone; they are removed when the
 * car is saved without them.
 */
export async function discardCarPhoto(carId: string, path: string): Promise<void> {
  await requireAdmin();
  const id = carIdSchema.safeParse(carId);
  const photo = photoPathSchema.safeParse(path);
  if (!id.success || !photo.success || !photo.data.startsWith(`${id.data}/`)) return;

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('car_images')
    .select('id', { count: 'exact', head: true })
    .eq('storage_path', photo.data);
  if (error || count !== 0) return;
  await supabase.storage.from(BUCKET).remove([photo.data]);
}
