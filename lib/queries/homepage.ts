import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { BODY_TYPES, type BodyType } from '@/lib/car-options';
import { CARD_SELECT, toPublicCarCard, type PublicCarCard } from '@/lib/queries/public-cars';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import {
  isServiceIcon,
  MAX_SERVICES,
  MAX_TEAM_MEMBERS,
  MAX_SOCIAL_LINKS,
  parseWhyUs,
  SOCIAL_PLATFORMS,
  type ServiceIcon,
  type SocialPlatform,
  type WhyUsItem,
} from '@/lib/validation/content';

// Homepage, About and Contact reads. Cached for every visitor and expired by
// tag when staff change content, testimonials or cars.

export type HomepageContent = {
  heroTitle: string;
  heroDescription: string | null;
  heroMedia: { url: string; type: 'image' | 'video' } | null;
  cta: { text: string; href: string } | null;
  whyUs: WhyUsItem[];
  videoUrl: string | null;
  testimonialVideos: string[];
  socialVideos: string[];
  reviewsSummary: { rating: number; count: number } | null;
  aboutTitle: string | null;
  aboutBody: string | null;
};

export const getHomepageContent = unstable_cache(
  async (): Promise<HomepageContent> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select(
        'hero_title, hero_description, hero_media_url, hero_media_type, cta_text, cta_link, why_us, video_url, testimonial_videos, social_videos, reviews_rating, reviews_count, about_title, about_body',
      )
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(`Could not load homepage content: ${error.message}`);

    const mediaType = data?.hero_media_type === 'video' ? 'video' : 'image';
    return {
      heroTitle: data?.hero_title ?? '',
      heroDescription: data?.hero_description ?? null,
      heroMedia: data?.hero_media_url ? { url: data.hero_media_url, type: mediaType } : null,
      cta: data?.cta_text && data.cta_link ? { text: data.cta_text, href: data.cta_link } : null,
      whyUs: parseWhyUs(data?.why_us),
      videoUrl: data?.video_url ?? null,
      testimonialVideos: data?.testimonial_videos ?? [],
      socialVideos: data?.social_videos ?? [],
      reviewsSummary:
        data?.reviews_rating != null && data.reviews_count != null
          ? { rating: Number(data.reviews_rating), count: data.reviews_count }
          : null,
      aboutTitle: data?.about_title ?? null,
      aboutBody: data?.about_body ?? null,
    };
  },
  ['homepage-content'],
  { revalidate: 3600, tags: [CACHE_TAGS.content] },
);

export type PublicSocialLink = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  thumbnailUrl: string | null;
};

/** Active social links for the homepage banner, in the order staff set. */
export const getSocialLinks = unstable_cache(
  async (): Promise<PublicSocialLink[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('social_links')
      .select('id, platform, label, url, thumbnail_url')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .limit(MAX_SOCIAL_LINKS);
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
            },
          ]
        : [],
    );
  },
  ['social-links'],
  { tags: [CACHE_TAGS.social] },
);

export const FEATURED_CARS_LIMIT = 6;

/**
 * Up to 6 featured cars that are available now (published, not reserved),
 * newest first. With none featured, the newest available cars instead.
 */
export const getHomepageCars = unstable_cache(
  async (): Promise<{ cars: PublicCarCard[]; featured: boolean }> => {
    const supabase = createSupabasePublicClient();
    const query = (featuredOnly: boolean) => {
      let q = supabase
        .from('cars')
        .select(CARD_SELECT)
        .eq('status', 'published')
        .order('is_primary', { referencedTable: 'car_images', ascending: false })
        .limit(1, { referencedTable: 'car_images' })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id')
        .limit(FEATURED_CARS_LIMIT);
      if (featuredOnly) q = q.eq('featured', true);
      return q;
    };

    const featured = await query(true);
    if (featured.error) throw new Error(`Could not load featured cars: ${featured.error.message}`);
    if (featured.data.length > 0) return { cars: featured.data.map(toPublicCarCard), featured: true };

    const newest = await query(false);
    if (newest.error) throw new Error(`Could not load cars: ${newest.error.message}`);
    return { cars: newest.data.map(toPublicCarCard), featured: false };
  },
  ['homepage-cars'],
  { tags: [CACHE_TAGS.cars] },
);

const browseOptionsSchema = z.object({
  brands: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      count: z.number(),
      models: z.array(z.object({ slug: z.string(), name: z.string(), count: z.number() })),
    }),
  ),
  bodyTypes: z.record(z.string(), z.number()),
});

export type BrowseOptions = {
  /** Brands with cars in stock, each with its models in stock. */
  brands: z.infer<typeof browseOptionsSchema>['brands'];
  bodyTypeCounts: Record<BodyType, number>;
};

/** Options for the hero search box and the body-type tiles. */
export const getBrowseOptions = unstable_cache(
  async (): Promise<BrowseOptions> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc('public_browse_options');
    if (error) throw new Error(`Could not load search options: ${error.message}`);
    const parsed = browseOptionsSchema.parse(data);
    const bodyTypeCounts = Object.fromEntries(BODY_TYPES.map((t) => [t, parsed.bodyTypes[t] ?? 0])) as Record<
      BodyType,
      number
    >;
    return { brands: parsed.brands, bodyTypeCounts };
  },
  ['browse-options'],
  { tags: [CACHE_TAGS.cars, CACHE_TAGS.brands] },
);

export type PublicTestimonial = {
  id: string;
  customerName: string;
  customerImage: string | null;
  review: string;
  reviewedWhen: string | null;
  rating: number;
};

export const HOMEPAGE_TESTIMONIALS_LIMIT = 6;

/** Published testimonials, newest first. */
export const getPublishedTestimonials = unstable_cache(
  async (limit: number): Promise<PublicTestimonial[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('testimonials')
      .select('id, customer_name, customer_image, review, reviewed_when, rating')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Could not load testimonials: ${error.message}`);
    return data.map((t) => ({
      id: t.id,
      customerName: t.customer_name,
      customerImage: t.customer_image,
      review: t.review,
      reviewedWhen: t.reviewed_when,
      rating: t.rating,
    }));
  },
  ['published-testimonials'],
  { tags: [CACHE_TAGS.testimonials] },
);

export const RECENTLY_SOLD_LIMIT = 8;

/** A sold car as the homepage shows it: card facts and cover photo only. */
export type SoldCarCard = PublicCarCard & { soldAt: string | null };

/**
 * Sold cars staff have not hidden, most recently sold first. Anon cannot read
 * sold rows, so this goes through recent_sold_cars() (security definer),
 * which returns only public card facts.
 */
export const getRecentlySoldCars = unstable_cache(
  async (): Promise<SoldCarCard[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc('recent_sold_cars', { p_limit: RECENTLY_SOLD_LIMIT });
    if (error) throw new Error(`Could not load sold cars: ${error.message}`);
    return data.map((car) => ({
      // Sold cards carry no database id; the unique slug serves as the key.
      id: car.slug,
      slug: car.slug,
      title: [car.year, car.brand, car.model].filter(Boolean).join(' '),
      brand: car.brand,
      model: car.model,
      bodyType: car.body_type,
      variant: car.variant,
      price: car.price,
      year: car.year,
      kmsDriven: car.kms_driven,
      fuelType: car.fuel_type,
      transmission: car.transmission,
      owners: car.owners,
      status: 'published' as const,
      featured: false,
      publishedAt: null,
      coverUrl: car.cover_url,
      soldAt: car.sold_at,
    }));
  },
  ['recently-sold-cars'],
  { tags: [CACHE_TAGS.cars] },
);

export type PublicService = {
  id: string;
  title: string;
  description: string;
  icon: ServiceIcon;
  ctaLabel: string | null;
  ctaLink: string | null;
};

/** Visible services for /about, in the order staff set. */
export const getServices = unstable_cache(
  async (): Promise<PublicService[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('services')
      .select('id, title, description, icon, cta_label, cta_link')
      .eq('is_visible', true)
      .order('sort_order')
      .order('created_at')
      .limit(MAX_SERVICES);
    if (error) throw new Error(`Could not load services: ${error.message}`);
    return data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      icon: isServiceIcon(row.icon) ? row.icon : 'car',
      ctaLabel: row.cta_label,
      ctaLink: row.cta_link,
    }));
  },
  ['services'],
  { tags: [CACHE_TAGS.services] },
);

export type PublicTeamMember = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
};

/** Visible team members for /about, in the order staff set. */
export const getTeamMembers = unstable_cache(
  async (): Promise<PublicTeamMember[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('id, name, role, bio, years_experience, photo_url')
      .eq('is_visible', true)
      .order('sort_order')
      .order('created_at')
      .limit(MAX_TEAM_MEMBERS);
    if (error) throw new Error(`Could not load the team: ${error.message}`);
    return data.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      bio: m.bio,
      yearsExperience: m.years_experience,
      photoUrl: m.photo_url,
    }));
  },
  ['team-members'],
  { tags: [CACHE_TAGS.team] },
);

export type TestimonialRating = { average: number; count: number };

/** Average and count of every published testimonial, for AggregateRating markup. Null with none. */
export const getTestimonialRating = unstable_cache(
  async (): Promise<TestimonialRating | null> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.from('testimonials').select('rating').eq('is_published', true).limit(5000);
    if (error) throw new Error(`Could not load testimonial ratings: ${error.message}`);
    if (data.length === 0) return null;
    const total = data.reduce((sum, t) => sum + t.rating, 0);
    return { average: Math.round((total / data.length) * 10) / 10, count: data.length };
  },
  ['testimonial-rating'],
  { tags: [CACHE_TAGS.testimonials] },
);
