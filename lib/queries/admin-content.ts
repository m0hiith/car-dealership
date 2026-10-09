import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  isServiceIcon,
  parseSocials,
  parseWhyUs,
  SOCIAL_PLATFORMS,
  type ServiceIcon,
  type SocialLinks,
  type SocialPlatform,
  type WhyUsItem,
} from '@/lib/validation/content';

// Admin reads for /admin/content, /admin/settings and /admin/testimonials.
// Uncached and cookie-scoped: they must show what was just saved.

export type AdminMedia = { url: string; type: 'image' | 'video' } | null;

export type AdminHomepageContent = {
  heroTitle: string;
  heroDescription: string;
  heroMedia: AdminMedia;
  ctaText: string;
  ctaLink: string;
  whyUs: WhyUsItem[];
  videoUrl: string;
  aboutTitle: string;
  aboutBody: string;
};

export async function getAdminHomepageContent(): Promise<AdminHomepageContent> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('homepage_content')
    .select(
      'hero_title, hero_description, hero_media_url, hero_media_type, cta_text, cta_link, why_us, video_url, about_title, about_body',
    )
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(`Could not load homepage content: ${error.message}`);
  return {
    heroTitle: data?.hero_title ?? '',
    heroDescription: data?.hero_description ?? '',
    heroMedia: data?.hero_media_url
      ? { url: data.hero_media_url, type: data.hero_media_type === 'video' ? 'video' : 'image' }
      : null,
    ctaText: data?.cta_text ?? '',
    ctaLink: data?.cta_link ?? '',
    whyUs: parseWhyUs(data?.why_us),
    videoUrl: data?.video_url ?? '',
    aboutTitle: data?.about_title ?? '',
    aboutBody: data?.about_body ?? '',
  };
}

export type AdminSiteSettings = {
  dealershipName: string;
  logoUrl: string | null;
  phone: string;
  whatsappNumber: string;
  address: string;
  mapUrl: string;
  businessHours: string;
  socials: SocialLinks;
  googleSiteVerification: string;
  feedbackEnabled: boolean;
  /** Whole minutes, as the settings form shows it. */
  feedbackDelayMinutes: string;
};

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select(
      'dealership_name, logo_url, phone, whatsapp_number, address, map_url, business_hours, socials, feedback_enabled, feedback_delay_seconds, google_site_verification',
    )
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return {
    dealershipName: data?.dealership_name ?? '',
    logoUrl: data?.logo_url ?? null,
    phone: data?.phone ?? '',
    whatsappNumber: data?.whatsapp_number ?? '',
    address: data?.address ?? '',
    mapUrl: data?.map_url ?? '',
    businessHours: data?.business_hours ?? '',
    socials: parseSocials(data?.socials),
    googleSiteVerification: data?.google_site_verification ?? '',
    feedbackEnabled: data?.feedback_enabled ?? true,
    feedbackDelayMinutes: String(Math.round((data?.feedback_delay_seconds ?? 300) / 60)),
  };
}

export type AdminTestimonial = {
  id: string;
  customerName: string;
  customerImage: string | null;
  review: string;
  rating: number;
  reviewedWhen: string | null;
  isPublished: boolean;
  createdAt: string;
};

/** Every testimonial, newest first. A dealer has tens, not thousands. */
export async function getAdminTestimonials(): Promise<AdminTestimonial[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, customer_name, customer_image, review, rating, reviewed_when, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load testimonials: ${error.message}`);
  return data.map((t) => ({
    id: t.id,
    customerName: t.customer_name,
    customerImage: t.customer_image,
    review: t.review,
    rating: t.rating,
    isPublished: t.is_published,
    reviewedWhen: t.reviewed_when,
    createdAt: t.created_at,
  }));
}

export type AdminSocialLink = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  thumbnailUrl: string | null;
  isActive: boolean;
};

/** Every social link in display order, including hidden ones. */
export async function getAdminSocialLinks(): Promise<AdminSocialLink[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('social_links')
    .select('id, platform, label, url, thumbnail_url, is_active')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) throw new Error(`Could not load social links: ${error.message}`);
  return data.flatMap((row) =>
    row.platform in SOCIAL_PLATFORMS
      ? [
          {
            id: row.id,
            platform: row.platform as SocialPlatform,
            label: row.label,
            url: row.url,
            thumbnailUrl: row.thumbnail_url,
            isActive: row.is_active,
          },
        ]
      : [],
  );
}

export type AdminService = {
  id: string;
  title: string;
  description: string;
  icon: ServiceIcon;
  ctaLabel: string | null;
  ctaLink: string | null;
  isVisible: boolean;
};

/** Every service in display order, including hidden ones. */
export async function getAdminServices(): Promise<AdminService[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('services')
    .select('id, title, description, icon, cta_label, cta_link, is_visible')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) throw new Error(`Could not load services: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: isServiceIcon(row.icon) ? row.icon : 'car',
    ctaLabel: row.cta_label,
    ctaLink: row.cta_link,
    isVisible: row.is_visible,
  }));
}

export type AdminTeamMember = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  isVisible: boolean;
};

/** Every team member in display order, including hidden ones. */
export async function getAdminTeamMembers(): Promise<AdminTeamMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, role, bio, years_experience, photo_url, is_visible')
    .order('sort_order')
    .order('created_at')
    .limit(100);
  if (error) throw new Error(`Could not load the team: ${error.message}`);
  return data.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    bio: m.bio,
    yearsExperience: m.years_experience,
    photoUrl: m.photo_url,
    isVisible: m.is_visible,
  }));
}
