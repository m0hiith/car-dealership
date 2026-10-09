import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { BodyType, CarStatus, FuelType, Transmission } from '@/lib/car-options';
import { CARD_SELECT, carTitle, toPublicCarCard, type PublicCarCard } from '@/lib/queries/public-cars';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// /cars/[slug] reads. Cached per slug and expired by the car's tag (or the
// shared cars tag) when staff change it (lib/actions/cars.ts).

export type CarPhoto = { id: string; url: string };

export type PublicCarDetail = {
  id: string;
  slug: string;
  /** "2022 Hyundai Creta" */
  title: string;
  brand: { name: string; slug: string } | null;
  model: string | null;
  variant: string | null;
  price: number;
  year: number;
  kmsDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  engineCc: number | null;
  owners: number;
  colour: string | null;
  registrationState: string | null;
  registrationCity: string | null;
  description: string | null;
  /** Staff overrides for the page title and meta description; null = generated. */
  seoTitle: string | null;
  seoDescription: string | null;
  status: Extract<CarStatus, 'published' | 'reserved'>;
  featured: boolean;
  publishedAt: string | null;
  /** Primary photo first, then sort_order. */
  photos: CarPhoto[];
  features: string[];
};

/** A published or reserved car, or null (draft, sold, archived, unknown). */
export const getPublicCarBySlug = cache((slug: string) =>
  unstable_cache(
    async (): Promise<PublicCarDetail | null> => {
      const supabase = createSupabasePublicClient();
      const { data: car, error } = await supabase
        .from('cars')
        .select(
          'id, slug, variant, price, year, kms_driven, fuel_type, transmission, body_type, engine_cc, owners, color, registration_state, registration_city, description, seo_title, seo_description, status, featured, published_at, brand:brands(name, slug), model:models!cars_model_id_brand_id_fkey(name), car_images(id, image_url, is_primary, sort_order), car_features(feature_name)',
        )
        .eq('slug', slug)
        .in('status', ['published', 'reserved'])
        .order('is_primary', { referencedTable: 'car_images', ascending: false })
        .order('sort_order', { referencedTable: 'car_images', ascending: true })
        .order('feature_name', { referencedTable: 'car_features', ascending: true })
        .maybeSingle();
      if (error) throw new Error(`Could not load car: ${error.message}`);
      if (!car) return null;

      return {
        id: car.id,
        slug: car.slug,
        title: carTitle(car),
        brand: car.brand,
        model: car.model?.name ?? null,
        variant: car.variant,
        price: car.price,
        year: car.year,
        kmsDriven: car.kms_driven,
        fuelType: car.fuel_type,
        transmission: car.transmission,
        bodyType: car.body_type,
        engineCc: car.engine_cc,
        owners: car.owners,
        colour: car.color,
        registrationState: car.registration_state,
        registrationCity: car.registration_city,
        description: car.description,
        seoTitle: car.seo_title,
        seoDescription: car.seo_description,
        status: car.status === 'reserved' ? 'reserved' : 'published',
        featured: car.featured,
        publishedAt: car.published_at,
        photos: car.car_images.map((img) => ({ id: img.id, url: img.image_url })),
        features: car.car_features.map((f) => f.feature_name),
      };
    },
    ['public-car', slug],
    { tags: [CACHE_TAGS.cars, CACHE_TAGS.car(slug)] },
  )(),
);

export type UnavailableCar = {
  title: string;
  variant: string | null;
  bodyType: BodyType;
  price: number;
  status: Extract<CarStatus, 'sold' | 'archived'>;
  soldAt: string | null;
};

/** What the public may know about a sold or archived car (no photos or internal fields). */
export const getUnavailableCar = cache((slug: string) =>
  unstable_cache(
    async (): Promise<UnavailableCar | null> => {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase.rpc('get_unavailable_car_by_slug', { p_slug: slug }).maybeSingle();
      if (error) throw new Error(`Could not load car: ${error.message}`);
      if (!data) return null;
      return {
        title: [data.year, data.brand, data.model].filter(Boolean).join(' '),
        variant: data.variant || null,
        bodyType: data.body_type,
        price: data.price,
        status: data.status === 'sold' ? 'sold' : 'archived',
        soldAt: data.sold_at,
      };
    },
    ['unavailable-car', slug],
    { tags: [CACHE_TAGS.cars, CACHE_TAGS.car(slug)] },
  )(),
);

export const SIMILAR_CARS_LIMIT = 6;

/**
 * Available cars like this one, closest match first.
 * strict: same body type and within ±20% of the price (detail page).
 * Otherwise same body type or price band (sold page).
 */
export const getSimilarCars = unstable_cache(
  async (
    { bodyType, price, excludeId }: { bodyType: BodyType; price: number; excludeId?: string },
    strict: boolean,
  ): Promise<PublicCarCard[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .rpc('similar_public_cars', {
        p_body_type: bodyType,
        p_price: price,
        p_exclude: excludeId,
        p_strict: strict,
        p_limit: SIMILAR_CARS_LIMIT,
      })
      .select(CARD_SELECT)
      .order('is_primary', { referencedTable: 'car_images', ascending: false })
      .limit(1, { referencedTable: 'car_images' });
    if (error) throw new Error(`Could not load similar cars: ${error.message}`);

    // The function orders its rows; PostgREST does not promise to keep that
    // order, so apply it again to the (at most 6) rows.
    const rank = (car: (typeof data)[number]) => {
      const inBand = car.price >= price * 0.8 && car.price <= price * 1.2;
      return [
        car.body_type === bodyType && inBand ? 0 : 1,
        car.status === 'reserved' ? 1 : 0,
        Math.abs(car.price - price),
      ];
    };
    return data
      .map((car) => ({ car, key: rank(car) }))
      .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2])
      .map(({ car }) => toPublicCarCard(car));
  },
  ['similar-cars'],
  { tags: [CACHE_TAGS.cars] },
);
