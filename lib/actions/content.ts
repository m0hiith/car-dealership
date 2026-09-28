'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { AdminTestimonial } from '@/lib/queries/admin-content';
import { isSiteMediaPath, isVideoPath, SITE_MEDIA_BUCKET, siteMediaPathFromUrl, siteMediaUrl } from '@/lib/site-media';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fieldErrors,
  homepageContentSchema,
  siteMediaUploadSchema,
  siteSettingsSchema,
  testimonialIdSchema,
  testimonialSchema,
  type FieldErrors,
  type MediaChange,
} from '@/lib/validation/content';

// Homepage content, site settings and testimonials. Every action re-checks
// admin access (CLAUDE.md §5) and runs as the signed-in user, so RLS applies
// on top. Each one expires the public cache tags it affects, so changes show
// on the site straight away.

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type SaveResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

const FIX_FIELDS = 'Please fix the highlighted fields.';

// ---------------------------------------------------------------------------
// Uploads to site-media
// ---------------------------------------------------------------------------

export type SiteMediaUploadTarget = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/** A one-time URL the browser uploads one file to. The server picks the path: {kind}/{uuid}.{ext}. */
export async function createSiteMediaUpload(raw: { kind: string; ext: string }): Promise<SiteMediaUploadTarget> {
  await requireAdmin();
  const parsed = siteMediaUploadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'This type of file cannot be uploaded here.' };

  const path = `${parsed.data.kind}/${randomUUID()}.${parsed.data.ext}`;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(SITE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload. Please try again.' };
  return { ok: true, path, signedUrl: data.signedUrl };
}

/** Deletes a file uploaded in a form that was then cleared or abandoned, unless something saved uses it. */
export async function discardSiteMedia(path: string): Promise<void> {
  await requireAdmin();
  if (!isSiteMediaPath(path)) return;
  const supabase = await createSupabaseServerClient();
  if (await isSiteMediaInUse(supabase, siteMediaUrl(path))) return;
  await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path]);
}

async function isSiteMediaInUse(supabase: Client, url: string): Promise<boolean> {
  const [content, settings, testimonials] = await Promise.all([
    supabase.from('homepage_content').select('id', { count: 'exact', head: true }).eq('hero_media_url', url),
    supabase.from('site_settings').select('id', { count: 'exact', head: true }).eq('logo_url', url),
    supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('customer_image', url),
  ]);
  // When unsure, keep the file: a leftover costs a little storage, a missing one breaks the page.
  if (content.error || settings.error || testimonials.error) return true;
  return (content.count ?? 0) + (settings.count ?? 0) + (testimonials.count ?? 0) > 0;
}

/**
 * The URL to save for a media field, plus the old file to delete once the
 * save succeeds (only files this app uploaded are ever deleted).
 */
function applyMediaChange(change: MediaChange, currentUrl: string | null) {
  if (change === 'keep') return { url: currentUrl, replaced: null };
  const replaced = siteMediaPathFromUrl(currentUrl);
  if (change === 'remove') return { url: null, replaced };
  const url = siteMediaUrl(change.path);
  return { url, replaced: url === currentUrl ? null : replaced };
}

async function removeReplacedMedia(supabase: Client, path: string | null) {
  if (!path) return;
  // Another row may use the same file (e.g. a photo reused by hand in the table editor).
  if (await isSiteMediaInUse(supabase, siteMediaUrl(path))) return;
  const { error } = await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path]);
  if (error) console.error('Could not delete a replaced site-media file', { path, message: error.message });
}

// ---------------------------------------------------------------------------
// Homepage content (/admin/content)
// ---------------------------------------------------------------------------

export async function saveHomepageContent(raw: unknown): Promise<SaveResult> {
  await requireAdmin();
  const parsed = homepageContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const c = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: current, error: loadError } = await supabase
    .from('homepage_content')
    .select('hero_media_url, hero_media_type')
    .eq('id', 1)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };

  const media = applyMediaChange(c.heroMedia, current?.hero_media_url ?? null);
  let mediaType: 'image' | 'video' | null = null;
  if (typeof c.heroMedia === 'object') mediaType = isVideoPath(c.heroMedia.path) ? 'video' : 'image';
  else if (media.url) mediaType = current?.hero_media_type === 'video' ? 'video' : 'image';

  const { count, error } = await supabase
    .from('homepage_content')
    .update(
      {
        hero_title: c.heroTitle,
        hero_description: c.heroDescription,
        hero_media_url: media.url,
        hero_media_type: mediaType,
        cta_text: c.ctaText,
        cta_link: c.ctaLink,
        why_us: c.whyUs,
        video_url: c.videoUrl,
        about_title: c.aboutTitle,
        about_body: c.aboutBody,
      },
      { count: 'exact' },
    )
    .eq('id', 1);
  if (error || count === 0) {
    console.error('saveHomepageContent failed', { code: error?.code, message: error?.message, count });
    return { ok: false, error: 'Could not save the homepage. Please try again.' };
  }

  await removeReplacedMedia(supabase, media.replaced);
  updateTag(CACHE_TAGS.content);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Site settings (/admin/settings)
// ---------------------------------------------------------------------------

export async function saveSiteSettings(raw: unknown): Promise<SaveResult> {
  await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const s = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: current, error: loadError } = await supabase
    .from('site_settings')
    .select('logo_url')
    .eq('id', 1)
    .maybeSingle();
  if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };

  const logo = applyMediaChange(s.logo, current?.logo_url ?? null);
  const socials = Object.fromEntries(Object.entries(s.socials).filter(([, url]) => url !== null));

  const { count, error } = await supabase
    .from('site_settings')
    .update(
      {
        dealership_name: s.dealershipName,
        logo_url: logo.url,
        phone: s.phone,
        whatsapp_number: s.whatsappNumber,
        address: s.address,
        map_url: s.mapUrl,
        business_hours: s.businessHours,
        socials,
      },
      { count: 'exact' },
    )
    .eq('id', 1);
  if (error || count === 0) {
    console.error('saveSiteSettings failed', { code: error?.code, message: error?.message, count });
    return { ok: false, error: 'Could not save the settings. Please try again.' };
  }

  await removeReplacedMedia(supabase, logo.replaced);
  updateTag(CACHE_TAGS.settings);
  // Dealership name in the admin sidebar.
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Testimonials (/admin/testimonials)
// ---------------------------------------------------------------------------

export type SaveTestimonialResult =
  { ok: true; testimonial: AdminTestimonial } | { ok: false; error: string; fieldErrors?: FieldErrors };

const TESTIMONIAL_COLUMNS = 'id, customer_name, customer_image, review, rating, is_published, created_at';

function toAdminTestimonial(row: {
  id: string;
  customer_name: string;
  customer_image: string | null;
  review: string;
  rating: number;
  is_published: boolean;
  created_at: string;
}): AdminTestimonial {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerImage: row.customer_image,
    review: row.review,
    rating: row.rating,
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

function revalidateTestimonials() {
  updateTag(CACHE_TAGS.testimonials);
  revalidatePath('/admin/testimonials');
}

/** Adds a testimonial (no id) or updates one. */
export async function saveTestimonial(raw: unknown): Promise<SaveTestimonialResult> {
  await requireAdmin();
  const parsed = testimonialSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const t = parsed.data;
  const supabase = await createSupabaseServerClient();

  let currentImage: string | null = null;
  if (t.id) {
    const { data: current, error: loadError } = await supabase
      .from('testimonials')
      .select('customer_image')
      .eq('id', t.id)
      .maybeSingle();
    if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (!current) return { ok: false, error: 'This testimonial no longer exists. Reload the page.' };
    currentImage = current.customer_image;
  }

  const photo = applyMediaChange(t.photo, currentImage);
  const values = {
    customer_name: t.customerName,
    customer_image: photo.url,
    review: t.review,
    rating: t.rating,
    is_published: t.isPublished,
  };
  const { data, error } = t.id
    ? await supabase.from('testimonials').update(values).eq('id', t.id).select(TESTIMONIAL_COLUMNS).single()
    : await supabase.from('testimonials').insert(values).select(TESTIMONIAL_COLUMNS).single();
  if (error) {
    console.error('saveTestimonial failed', { id: t.id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save the testimonial. Please try again.' };
  }

  await removeReplacedMedia(supabase, photo.replaced);
  revalidateTestimonials();
  return { ok: true, testimonial: toAdminTestimonial(data) };
}

export type TestimonialActionResult = { ok: true } | { ok: false; error: string };

export async function setTestimonialPublished(id: string, published: boolean): Promise<TestimonialActionResult> {
  await requireAdmin();
  const parsedId = testimonialIdSchema.safeParse(id);
  if (!parsedId.success || typeof published !== 'boolean') return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('testimonials')
    .update({ is_published: published }, { count: 'exact' })
    .eq('id', parsedId.data);
  if (error) return { ok: false, error: 'Could not update the testimonial. Please try again.' };
  if (count === 0) return { ok: false, error: 'This testimonial no longer exists. Reload the page.' };

  revalidateTestimonials();
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<TestimonialActionResult> {
  await requireAdmin();
  const parsedId = testimonialIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
    .delete()
    .eq('id', parsedId.data)
    .select('customer_image')
    .maybeSingle();
  if (error) return { ok: false, error: 'Could not delete the testimonial. Please try again.' };
  if (!data) return { ok: false, error: 'This testimonial no longer exists. Reload the page.' };

  await removeReplacedMedia(supabase, siteMediaPathFromUrl(data.customer_image));
  revalidateTestimonials();
  return { ok: true };
}
