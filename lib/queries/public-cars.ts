import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { CarStatus, FuelType, Transmission } from '@/lib/car-options';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { PUBLIC_CARS_PAGE_SIZE, type PublicSort, type RpcFilters } from '@/lib/validation/public-cars';

// Public showroom reads. Cached for every visitor and expired by tag when
// staff change a car (lib/actions/cars.ts), so no time-based revalidation.

export type PublicCarCard = {
  id: string;
  slug: string;
  title: string;
  variant: string | null;
  price: number;
  year: number;
  kmsDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  owners: number;
  status: Extract<CarStatus, 'published' | 'reserved'>;
  featured: boolean;
  publishedAt: string | null;
  coverUrl: string | null;
};

export type PublicCarList = { cars: PublicCarCard[]; total: number };

const SORTS: Record<PublicSort, { column: 'published_at' | 'price' | 'kms_driven' | 'year'; ascending: boolean }> = {
  newest: { column: 'published_at', ascending: false },
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  km_asc: { column: 'kms_driven', ascending: true },
  year_desc: { column: 'year', ascending: false },
};

/** The first `limit` matching cars ("Load more" grows the limit) and the total. */
export const getPublicCars = unstable_cache(
  async (filters: RpcFilters, sort: PublicSort, limit: number): Promise<PublicCarList> => {
    const supabase = createSupabasePublicClient();
    const order = SORTS[sort];
    const { data, count, error } = await supabase
      .rpc('filter_public_cars', { p_filters: filters }, { count: 'exact' })
      .select(
        'id, slug, variant, price, year, kms_driven, fuel_type, transmission, owners, status, featured, published_at, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name), car_images(image_url, is_primary)',
      )
      // Cover photo only. (Filtering an embed is not supported on an RPC
      // result, so sort the cover first and take one.)
      .order('is_primary', { referencedTable: 'car_images', ascending: false })
      .limit(1, { referencedTable: 'car_images' })
      // car_status is an enum declared draft, published, reserved, ..., so
      // ascending puts available cars before reserved ones.
      .order('status')
      .order(order.column, { ascending: order.ascending, nullsFirst: false })
      .order('id')
      .range(0, Math.max(limit, PUBLIC_CARS_PAGE_SIZE) - 1);
    if (error) throw new Error(`Could not load cars: ${error.message}`);

    return {
      total: count ?? 0,
      cars: data.map((car) => ({
        id: car.id,
        slug: car.slug,
        title: [car.year, car.brand?.name, car.model?.name].filter(Boolean).join(' '),
        variant: car.variant,
        price: car.price,
        year: car.year,
        kmsDriven: car.kms_driven,
        fuelType: car.fuel_type,
        transmission: car.transmission,
        owners: car.owners,
        // filter_public_cars only returns these two.
        status: car.status === 'reserved' ? 'reserved' : 'published',
        featured: car.featured,
        publishedAt: car.published_at,
        coverUrl: car.car_images[0]?.image_url ?? null,
      })),
    };
  },
  ['public-cars'],
  { tags: [CACHE_TAGS.cars] },
);

const facetsSchema = z.object({
  brands: z.array(z.object({ slug: z.string(), name: z.string(), count: z.number() })),
  models: z.array(
    z.object({ slug: z.string(), name: z.string(), brandSlug: z.string(), brandName: z.string(), count: z.number() }),
  ),
  colours: z.array(z.object({ value: z.string(), name: z.string(), count: z.number() })),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
});

export type CarFacets = z.infer<typeof facetsSchema>;

/** Filter options with counts: brands, models of the selected brands, colours, and the price range of all stock. */
export const getCarFacets = unstable_cache(
  async (filters: RpcFilters): Promise<CarFacets> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc('public_car_facets', { p_filters: filters });
    if (error) throw new Error(`Could not load filters: ${error.message}`);
    return facetsSchema.parse(data);
  },
  ['public-car-facets'],
  { tags: [CACHE_TAGS.cars, CACHE_TAGS.brands] },
);

/** An active brand by slug, for /cars/brand/[brand]. */
export const getPublicBrand = unstable_cache(
  async (slug: string): Promise<{ slug: string; name: string } | null> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('brands')
      .select('slug, name')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(`Could not load brand: ${error.message}`);
    return data;
  },
  ['public-brand'],
  { tags: [CACHE_TAGS.brands] },
);
