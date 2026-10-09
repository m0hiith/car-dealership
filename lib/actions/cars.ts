'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { CarStatus } from '@/lib/car-options';
import { canMoveTo } from '@/lib/car-status';
import { buildCarSlug, carSlugCandidates, randomSlugCode, slugify, withSlugTail } from '@/lib/slug';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { carStatusChangeSchema, type CarStatusChange } from '@/lib/validation/admin-cars';
import {
  carFieldErrors,
  carIdSchema,
  carSaveSchema,
  newBrandSchema,
  newModelSchema,
  photoPathSchema,
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

const FIX_FIELDS = 'Please fix the highlighted fields.';

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
    .select('status, slug, published_at')
    .eq('id', car.id)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };

  if (!canMoveTo(current?.status ?? null, car.status)) {
    return { ok: false, error: 'That status change is not allowed. Reload the page and try again.' };
  }

  // The web address is made from the car's details. It follows edits until
  // the car first goes public, then stays fixed so shared links keep working.
  let slug: string;
  if (current?.published_at) {
    slug = current.slug;
  } else {
    const [brand, model] = await Promise.all([
      supabase.from('brands').select('name').eq('id', car.brandId).maybeSingle(),
      supabase.from('models').select('name').eq('id', car.modelId).eq('brand_id', car.brandId).maybeSingle(),
    ]);
    if (brand.error || model.error) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (!brand.data) return { ok: false, error: FIX_FIELDS, fieldErrors: { brandId: 'Choose a brand.' } };
    if (!model.data)
      return { ok: false, error: FIX_FIELDS, fieldErrors: { modelId: 'Choose a model from this brand.' } };
    const base = buildCarSlug({
      year: car.year,
      brand: brand.data.name,
      model: model.data.name,
      variant: car.variant,
      fuelType: car.fuelType,
      transmission: car.transmission,
    });
    slug = await findFreeSlug(supabase, base, car.color, car.id);
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
      // Another car with the same details was saved at the same moment.
      return { ok: false, error: 'Could not save just now. Please save again.' };
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

  // Search overrides are not part of save_car(); the car row exists by now.
  const { error: seoError } = await supabase
    .from('cars')
    .update({ seo_title: car.seoTitle, seo_description: car.seoDescription })
    .eq('id', car.id);

  updateTag(CACHE_TAGS.cars);
  updateTag(CACHE_TAGS.car(slug));
  if (current && current.slug !== slug) updateTag(CACHE_TAGS.car(current.slug));
  revalidatePath('/admin', 'layout');

  if (seoError) {
    console.error('Saving search overrides failed', { carId: car.id, code: seoError.code, message: seoError.message });
    return {
      ok: false,
      error: 'The car was saved, but the search title and description were not. Save again to retry.',
    };
  }
  return { ok: true, id: car.id, slug, status: car.status, created: !current };
}

/**
 * The first free address for these details: plain, then with the colour,
 * then with a short random code. Never a running number.
 */
async function findFreeSlug(supabase: Client, base: string, colour: string | null, carId: string) {
  const { data, error } = await supabase.from('cars').select('slug').like('slug', `${base}%`).neq('id', carId);
  if (error) throw new Error(`Could not check the web address: ${error.message}`);
  const taken = new Set(data.map((c) => c.slug));
  const candidates = carSlugCandidates(base, colour);
  const free = candidates.find((c) => !taken.has(c));
  if (free) return free;
  const stem = candidates[candidates.length - 1]!;
  for (;;) {
    const candidate = withSlugTail(stem, randomSlugCode());
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
// Add a brand inline
// ---------------------------------------------------------------------------

export type CreateBrandResult =
  { ok: true; brand: { id: string; name: string; isActive: boolean } } | { ok: false; error: string };

/**
 * A brand typed into the car form that is not in the list yet. It shows on
 * the public site (filters, /cars/brand/...) once a car of it is published.
 */
export async function createBrand(raw: { name: string }): Promise<CreateBrandResult> {
  await requireAdmin();
  const parsed = newBrandSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter the brand name.' };

  const name = parsed.data.name.replace(/\s+/g, ' ');
  const slug = slugify(name);
  const supabase = await createSupabaseServerClient();

  // Reuse the existing brand if someone already added it (maybe spelt differently).
  const existing = await supabase.from('brands').select('id, name, is_active').eq('slug', slug).maybeSingle();
  if (existing.error) return { ok: false, error: 'Could not add the brand. Please try again.' };

  let brand = existing.data;
  if (!brand) {
    const inserted = await supabase.from('brands').insert({ name, slug }).select('id, name, is_active').single();
    if (inserted.error) return { ok: false, error: 'Could not add the brand. Please try again.' };
    brand = inserted.data;
  } else if (!brand.is_active) {
    const reactivated = await supabase
      .from('brands')
      .update({ is_active: true })
      .eq('id', brand.id)
      .select('id, name, is_active')
      .single();
    if (reactivated.error) return { ok: false, error: 'Could not add the brand. Please try again.' };
    brand = reactivated.data;
  }

  updateTag(CACHE_TAGS.brands);
  return { ok: true, brand: { id: brand.id, name: brand.name, isActive: brand.is_active } };
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

// ---------------------------------------------------------------------------
// Inventory row actions (/admin/cars)
// ---------------------------------------------------------------------------

export type CarActionResult = { ok: true } | { ok: false; error: string };

function revalidateCar(slug: string) {
  updateTag(CACHE_TAGS.cars);
  updateTag(CACHE_TAGS.car(slug));
  revalidatePath('/admin', 'layout');
}

/** Quick status change from the list. Same rules as the form's status actions. */
export async function setCarStatus(raw: CarStatusChange): Promise<CarActionResult> {
  await requireAdmin();
  const parsed = carStatusChangeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  const { id, to } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: car, error: loadError } = await supabase.from('cars').select('status, slug').eq('id', id).maybeSingle();
  if (loadError) return { ok: false, error: 'Could not update the car. Please try again.' };
  if (!car) return { ok: false, error: 'This car no longer exists. Reload the page.' };
  if (car.status === to) return { ok: true };
  if (!canMoveTo(car.status, to)) {
    return { ok: false, error: 'That status change is not allowed. Reload the page and try again.' };
  }

  // Only update if nobody changed the status in the meantime.
  const { count, error } = await supabase
    .from('cars')
    .update({ status: to }, { count: 'exact' })
    .eq('id', id)
    .eq('status', car.status);
  if (error) {
    if (error.hint === 'car_needs_photo') {
      return { ok: false, error: 'Add at least one photo before publishing. Open the car to add photos.' };
    }
    console.error('setCarStatus failed', { carId: id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not update the car. Please try again.' };
  }
  if (count === 0) return { ok: false, error: 'Someone else just changed this car. Reload the page and try again.' };

  revalidateCar(car.slug);
  return { ok: true };
}

/** Shows or hides a sold car in the homepage "Recently Sold" section. Only sold cars have the setting. */
export async function setShowInSoldSection(carId: string, show: boolean): Promise<CarActionResult> {
  await requireAdmin();
  const id = carIdSchema.safeParse(carId);
  if (!id.success || typeof show !== 'boolean') return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data: car, error: loadError } = await supabase
    .from('cars')
    .select('status, slug')
    .eq('id', id.data)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not update the car. Please try again.' };
  if (!car) return { ok: false, error: 'This car no longer exists. Reload the page.' };
  if (car.status !== 'sold') return { ok: false, error: 'Only sold cars can be shown here.' };

  const { error } = await supabase.from('cars').update({ show_in_sold_section: show }).eq('id', id.data);
  if (error) {
    console.error('setShowInSoldSection failed', { carId: id.data, code: error.code, message: error.message });
    return { ok: false, error: 'Could not update the car. Please try again.' };
  }

  revalidateCar(car.slug);
  return { ok: true };
}

export type DuplicateCarResult = { ok: true; id: string } | { ok: false; error: string };

/** A new draft with every field and feature copied, except photos and the web address. */
export async function duplicateCar(carId: string): Promise<DuplicateCarResult> {
  await requireAdmin();
  const id = carIdSchema.safeParse(carId);
  if (!id.success) return { ok: false, error: 'Invalid car.' };

  const supabase = await createSupabaseServerClient();
  const { data: car, error: loadError } = await supabase
    .from('cars')
    .select(
      'brand_id, model_id, variant, price, original_price, year, kms_driven, fuel_type, transmission, body_type, engine_cc, owners, color, registration_state, registration_city, description, featured, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name), car_features(feature_name)',
    )
    .eq('id', id.data)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not duplicate the car. Please try again.' };
  if (!car) return { ok: false, error: 'This car no longer exists. Reload the page.' };

  const newId = randomUUID();
  const slug = await findFreeSlug(
    supabase,
    buildCarSlug({
      year: car.year,
      brand: car.brand?.name,
      model: car.model?.name,
      variant: car.variant,
      fuelType: car.fuel_type,
      transmission: car.transmission,
    }),
    car.color,
    newId,
  );

  const { url } = getSupabasePublicEnv();
  const { error } = await supabase.rpc('save_car', {
    p_car_id: newId,
    p_car: {
      brand_id: car.brand_id,
      model_id: car.model_id,
      variant: car.variant,
      slug,
      price: car.price,
      original_price: car.original_price,
      year: car.year,
      kms_driven: car.kms_driven,
      fuel_type: car.fuel_type,
      transmission: car.transmission,
      body_type: car.body_type,
      engine_cc: car.engine_cc,
      owners: car.owners,
      color: car.color,
      registration_state: car.registration_state,
      registration_city: car.registration_city,
      description: car.description,
      status: 'draft',
      featured: car.featured,
    },
    p_features: car.car_features.map((f) => f.feature_name),
    p_photos: [],
    p_photo_base_url: `${url}/storage/v1/object/public/${BUCKET}`,
  });
  if (error) {
    console.error('duplicateCar failed', { carId: id.data, code: error.code, message: error.message });
    return { ok: false, error: 'Could not duplicate the car. Please try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true, id: newId };
}

/**
 * Permanently deletes a draft and its photo files. Anything that has been
 * published is archived instead; RLS enforces the same rule.
 */
export async function deleteDraftCar(carId: string): Promise<CarActionResult> {
  await requireAdmin();
  const id = carIdSchema.safeParse(carId);
  if (!id.success) return { ok: false, error: 'Invalid car.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('cars')
    .delete({ count: 'exact' })
    .eq('id', id.data)
    .eq('status', 'draft');
  if (error) {
    console.error('deleteDraftCar failed', { carId: id.data, code: error.code, message: error.message });
    return { ok: false, error: 'Could not delete the car. Please try again.' };
  }
  if (count === 0) return { ok: false, error: 'Only drafts can be deleted. Archive this car instead.' };

  // Best effort: the car row is gone, so leftover files never show anywhere.
  const storage = supabase.storage.from(BUCKET);
  const { data: files } = await storage.list(id.data, { limit: 1000 });
  if (files?.length) {
    const { error: removeError } = await storage.remove(files.map((f) => `${id.data}/${f.name}`));
    if (removeError) console.error('Could not delete photos of a deleted draft', { carId: id.data });
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
