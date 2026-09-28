import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseSocials, parseWhyUs, type SocialLinks, type WhyUsItem } from '@/lib/validation/content';

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
};

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('dealership_name, logo_url, phone, whatsapp_number, address, map_url, business_hours, socials')
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
  };
}

export type AdminTestimonial = {
  id: string;
  customerName: string;
  customerImage: string | null;
  review: string;
  rating: number;
  isPublished: boolean;
  createdAt: string;
};

/** Every testimonial, newest first. A dealer has tens, not thousands. */
export async function getAdminTestimonials(): Promise<AdminTestimonial[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, customer_name, customer_image, review, rating, is_published, created_at')
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
    createdAt: t.created_at,
  }));
}
