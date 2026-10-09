'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { AdminService, AdminSocialLink, AdminTeamMember, AdminTestimonial } from '@/lib/queries/admin-content';
import { isSiteMediaPath, isVideoPath, SITE_MEDIA_BUCKET, siteMediaPathFromUrl, siteMediaUrl } from '@/lib/site-media';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fieldErrors,
  homepageContentSchema,
  siteMediaUploadSchema,
  MAX_SERVICES,
  serviceIdSchema,
  serviceSchema,
  siteSettingsSchema,
  MAX_TEAM_MEMBERS,
  socialLinkIdSchema,
  socialLinkSchema,
  teamMemberIdSchema,
  teamMemberSchema,
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
  const [content, settings, testimonials, social, team] = await Promise.all([
    supabase.from('homepage_content').select('id', { count: 'exact', head: true }).eq('hero_media_url', url),
    supabase.from('site_settings').select('id', { count: 'exact', head: true }).eq('logo_url', url),
    supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('customer_image', url),
    supabase.from('social_links').select('id', { count: 'exact', head: true }).eq('thumbnail_url', url),
    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('photo_url', url),
  ]);
  // When unsure, keep the file: a leftover costs a little storage, a missing one breaks the page.
  if (content.error || settings.error || testimonials.error || social.error || team.error) return true;
  return [content, settings, testimonials, social, team].some((r) => (r.count ?? 0) > 0);
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
        google_site_verification: s.googleSiteVerification,
        feedback_enabled: s.feedbackEnabled,
        feedback_delay_seconds: s.feedbackDelayMinutes * 60,
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

const TESTIMONIAL_COLUMNS =
  'id, customer_name, customer_image, review, rating, reviewed_when, is_published, created_at';

function toAdminTestimonial(row: {
  id: string;
  customer_name: string;
  customer_image: string | null;
  review: string;
  rating: number;
  reviewed_when: string | null;
  is_published: boolean;
  created_at: string;
}): AdminTestimonial {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerImage: row.customer_image,
    review: row.review,
    rating: row.rating,
    reviewedWhen: row.reviewed_when,
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
    reviewed_when: t.reviewedWhen ?? null,
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

// ---------------------------------------------------------------------------
// Social links (/admin/content)
// ---------------------------------------------------------------------------

export type SaveSocialLinkResult =
  { ok: true; link: AdminSocialLink } | { ok: false; error: string; fieldErrors?: FieldErrors };

export type SocialLinkActionResult = { ok: true } | { ok: false; error: string };

const SOCIAL_LINK_COLUMNS = 'id, platform, label, url, thumbnail_url, is_active';

function revalidateSocialLinks() {
  updateTag(CACHE_TAGS.social);
  revalidatePath('/admin/content');
}

/** Adds a social link (no id) or updates one. New links go to the end of the banner. */
export async function saveSocialLink(raw: unknown): Promise<SaveSocialLinkResult> {
  await requireAdmin();
  const parsed = socialLinkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const l = parsed.data;
  const supabase = await createSupabaseServerClient();

  let currentThumbnail: string | null = null;
  let sortOrder = 0;
  if (l.id) {
    const { data: current, error: loadError } = await supabase
      .from('social_links')
      .select('thumbnail_url')
      .eq('id', l.id)
      .maybeSingle();
    if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (!current) return { ok: false, error: 'This link no longer exists. Reload the page.' };
    currentThumbnail = current.thumbnail_url;
  } else {
    const { data: last, error: lastError } = await supabase
      .from('social_links')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const thumbnail = applyMediaChange(l.thumbnail, currentThumbnail);
  const values = {
    platform: l.platform,
    label: l.label,
    url: l.url,
    thumbnail_url: thumbnail.url,
    is_active: l.isActive,
  };
  const { data, error } = l.id
    ? await supabase.from('social_links').update(values).eq('id', l.id).select(SOCIAL_LINK_COLUMNS).single()
    : await supabase
        .from('social_links')
        .insert({ ...values, sort_order: sortOrder })
        .select(SOCIAL_LINK_COLUMNS)
        .single();
  if (error) {
    console.error('saveSocialLink failed', { id: l.id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save the link. Please try again.' };
  }

  await removeReplacedMedia(supabase, thumbnail.replaced);
  revalidateSocialLinks();
  return {
    ok: true,
    link: {
      id: data.id,
      platform: l.platform,
      label: data.label,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      isActive: data.is_active,
    },
  };
}

export async function setSocialLinkActive(id: string, active: boolean): Promise<SocialLinkActionResult> {
  await requireAdmin();
  const parsedId = socialLinkIdSchema.safeParse(id);
  if (!parsedId.success || typeof active !== 'boolean') return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('social_links')
    .update({ is_active: active }, { count: 'exact' })
    .eq('id', parsedId.data);
  if (error) return { ok: false, error: 'Could not update the link. Please try again.' };
  if (count === 0) return { ok: false, error: 'This link no longer exists. Reload the page.' };

  revalidateSocialLinks();
  return { ok: true };
}

/** Swaps a link's place with its neighbour in the banner. */
export async function moveSocialLink(id: string, direction: 'up' | 'down'): Promise<SocialLinkActionResult> {
  await requireAdmin();
  const parsedId = socialLinkIdSchema.safeParse(id);
  if (!parsedId.success || (direction !== 'up' && direction !== 'down'))
    return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('social_links')
    .select('id')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) return { ok: false, error: 'Could not move the link. Please try again.' };

  const ids = rows.map((r) => r.id);
  const from = ids.indexOf(parsedId.data);
  if (from === -1) return { ok: false, error: 'This link no longer exists. Reload the page.' };
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return { ok: true };

  // Renumber the whole list so ties and gaps cannot make the order ambiguous.
  const moved = ids[from]!;
  ids[from] = ids[to]!;
  ids[to] = moved;
  const results = await Promise.all(
    ids.map((linkId, index) => supabase.from('social_links').update({ sort_order: index }).eq('id', linkId)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: 'Could not move the link. Please try again.' };

  revalidateSocialLinks();
  return { ok: true };
}

export async function deleteSocialLink(id: string): Promise<SocialLinkActionResult> {
  await requireAdmin();
  const parsedId = socialLinkIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('social_links')
    .delete()
    .eq('id', parsedId.data)
    .select('thumbnail_url')
    .maybeSingle();
  if (error) return { ok: false, error: 'Could not delete the link. Please try again.' };
  if (!data) return { ok: false, error: 'This link no longer exists. Reload the page.' };

  await removeReplacedMedia(supabase, siteMediaPathFromUrl(data.thumbnail_url));
  revalidateSocialLinks();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Services (/admin/content, shown on /about)
// ---------------------------------------------------------------------------

export type SaveServiceResult =
  { ok: true; service: AdminService } | { ok: false; error: string; fieldErrors?: FieldErrors };

export type ServiceActionResult = { ok: true } | { ok: false; error: string };

function revalidateServices() {
  updateTag(CACHE_TAGS.services);
  revalidatePath('/admin/content');
}

/** Adds a service (no id) or updates one. New services go to the end of the list. */
export async function saveService(raw: unknown): Promise<SaveServiceResult> {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const sv = parsed.data;
  const supabase = await createSupabaseServerClient();

  const values = {
    title: sv.title,
    description: sv.description,
    icon: sv.icon,
    cta_label: sv.ctaLabel,
    cta_link: sv.ctaLink,
    is_visible: sv.isVisible,
  };

  let result;
  if (sv.id) {
    result = await supabase.from('services').update(values).eq('id', sv.id).select('id').maybeSingle();
    if (!result.error && !result.data) return { ok: false, error: 'This service no longer exists. Reload the page.' };
  } else {
    const { data: rows, error: countError } = await supabase
      .from('services')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(MAX_SERVICES);
    if (countError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (rows.length >= MAX_SERVICES) return { ok: false, error: `You can have up to ${MAX_SERVICES} services.` };
    result = await supabase
      .from('services')
      .insert({ ...values, sort_order: (rows[0]?.sort_order ?? -1) + 1 })
      .select('id')
      .single();
  }
  if (result.error || !result.data) {
    console.error('saveService failed', { id: sv.id, code: result.error?.code, message: result.error?.message });
    return { ok: false, error: 'Could not save the service. Please try again.' };
  }

  revalidateServices();
  return {
    ok: true,
    service: {
      id: result.data.id,
      title: sv.title,
      description: sv.description,
      icon: sv.icon,
      ctaLabel: sv.ctaLabel,
      ctaLink: sv.ctaLink,
      isVisible: sv.isVisible,
    },
  };
}

export async function setServiceVisible(id: string, visible: boolean): Promise<ServiceActionResult> {
  await requireAdmin();
  const parsedId = serviceIdSchema.safeParse(id);
  if (!parsedId.success || typeof visible !== 'boolean') return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('services')
    .update({ is_visible: visible }, { count: 'exact' })
    .eq('id', parsedId.data);
  if (error) return { ok: false, error: 'Could not update the service. Please try again.' };
  if (count === 0) return { ok: false, error: 'This service no longer exists. Reload the page.' };

  revalidateServices();
  return { ok: true };
}

/** Swaps a service's place with its neighbour. */
export async function moveService(id: string, direction: 'up' | 'down'): Promise<ServiceActionResult> {
  await requireAdmin();
  const parsedId = serviceIdSchema.safeParse(id);
  if (!parsedId.success || (direction !== 'up' && direction !== 'down'))
    return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('services')
    .select('id')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) return { ok: false, error: 'Could not move the service. Please try again.' };

  const ids = rows.map((r) => r.id);
  const from = ids.indexOf(parsedId.data);
  if (from === -1) return { ok: false, error: 'This service no longer exists. Reload the page.' };
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return { ok: true };

  // Renumber the whole list so ties and gaps cannot make the order ambiguous.
  const moved = ids[from]!;
  ids[from] = ids[to]!;
  ids[to] = moved;
  const results = await Promise.all(
    ids.map((serviceId, index) => supabase.from('services').update({ sort_order: index }).eq('id', serviceId)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: 'Could not move the service. Please try again.' };

  revalidateServices();
  return { ok: true };
}

export async function deleteService(id: string): Promise<ServiceActionResult> {
  await requireAdmin();
  const parsedId = serviceIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase.from('services').delete({ count: 'exact' }).eq('id', parsedId.data);
  if (error) return { ok: false, error: 'Could not delete the service. Please try again.' };
  if (count === 0) return { ok: false, error: 'This service no longer exists. Reload the page.' };

  revalidateServices();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Team (/admin/content, shown on /about)
// ---------------------------------------------------------------------------

export type SaveTeamMemberResult =
  { ok: true; member: AdminTeamMember } | { ok: false; error: string; fieldErrors?: FieldErrors };

export type TeamActionResult = { ok: true } | { ok: false; error: string };

const TEAM_COLUMNS = 'id, name, role, bio, years_experience, photo_url, is_visible';

function revalidateTeam() {
  updateTag(CACHE_TAGS.team);
  revalidatePath('/admin/content');
}

/** Adds a team member (no id) or updates one. New members go to the end. */
export async function saveTeamMember(raw: unknown): Promise<SaveTeamMemberResult> {
  await requireAdmin();
  const parsed = teamMemberSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: FIX_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const t = parsed.data;
  const supabase = await createSupabaseServerClient();

  let currentPhoto: string | null = null;
  let sortOrder = 0;
  if (t.id) {
    const { data: current, error: loadError } = await supabase
      .from('team_members')
      .select('photo_url')
      .eq('id', t.id)
      .maybeSingle();
    if (loadError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (!current) return { ok: false, error: 'This team member no longer exists. Reload the page.' };
    currentPhoto = current.photo_url;
  } else {
    const { data: rows, error: countError } = await supabase
      .from('team_members')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(MAX_TEAM_MEMBERS);
    if (countError) return { ok: false, error: 'Could not save. Check your connection and try again.' };
    if (rows.length >= MAX_TEAM_MEMBERS) return { ok: false, error: `You can add up to ${MAX_TEAM_MEMBERS} people.` };
    sortOrder = (rows[0]?.sort_order ?? -1) + 1;
  }

  const photo = applyMediaChange(t.photo, currentPhoto);
  const values = {
    name: t.name,
    role: t.role,
    bio: t.bio,
    years_experience: t.yearsExperience,
    photo_url: photo.url,
    is_visible: t.isVisible,
  };
  const { data, error } = t.id
    ? await supabase.from('team_members').update(values).eq('id', t.id).select(TEAM_COLUMNS).single()
    : await supabase
        .from('team_members')
        .insert({ ...values, sort_order: sortOrder })
        .select(TEAM_COLUMNS)
        .single();
  if (error) {
    console.error('saveTeamMember failed', { id: t.id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save. Please try again.' };
  }

  await removeReplacedMedia(supabase, photo.replaced);
  revalidateTeam();
  return {
    ok: true,
    member: {
      id: data.id,
      name: data.name,
      role: data.role,
      bio: data.bio,
      yearsExperience: data.years_experience,
      photoUrl: data.photo_url,
      isVisible: data.is_visible,
    },
  };
}

export async function setTeamMemberVisible(id: string, visible: boolean): Promise<TeamActionResult> {
  await requireAdmin();
  const parsedId = teamMemberIdSchema.safeParse(id);
  if (!parsedId.success || typeof visible !== 'boolean') return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('team_members')
    .update({ is_visible: visible }, { count: 'exact' })
    .eq('id', parsedId.data);
  if (error) return { ok: false, error: 'Could not update. Please try again.' };
  if (count === 0) return { ok: false, error: 'This team member no longer exists. Reload the page.' };

  revalidateTeam();
  return { ok: true };
}

/** Swaps a team member's place with their neighbour. */
export async function moveTeamMember(id: string, direction: 'up' | 'down'): Promise<TeamActionResult> {
  await requireAdmin();
  const parsedId = teamMemberIdSchema.safeParse(id);
  if (!parsedId.success || (direction !== 'up' && direction !== 'down'))
    return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('team_members')
    .select('id')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) return { ok: false, error: 'Could not move. Please try again.' };

  const ids = rows.map((r) => r.id);
  const from = ids.indexOf(parsedId.data);
  if (from === -1) return { ok: false, error: 'This team member no longer exists. Reload the page.' };
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return { ok: true };

  // Renumber the whole list so ties and gaps cannot make the order ambiguous.
  const moved = ids[from]!;
  ids[from] = ids[to]!;
  ids[to] = moved;
  const results = await Promise.all(
    ids.map((memberId, index) => supabase.from('team_members').update({ sort_order: index }).eq('id', memberId)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: 'Could not move. Please try again.' };

  revalidateTeam();
  return { ok: true };
}

export async function deleteTeamMember(id: string): Promise<TeamActionResult> {
  await requireAdmin();
  const parsedId = teamMemberIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', parsedId.data)
    .select('photo_url')
    .maybeSingle();
  if (error) return { ok: false, error: 'Could not delete. Please try again.' };
  if (!data) return { ok: false, error: 'This team member no longer exists. Reload the page.' };

  await removeReplacedMedia(supabase, siteMediaPathFromUrl(data.photo_url));
  revalidateTeam();
  return { ok: true };
}
