import 'server-only';
import { CAR_STATUSES, type BodyType, type CarStatus, type FuelType, type Transmission } from '@/lib/car-options';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  INVENTORY_PAGE_SIZE,
  inventorySearchTokens,
  type InventoryParams,
  type InventorySort,
} from '@/lib/validation/admin-cars';

// Runs as the signed-in user, so RLS limits results to admins. Callers must
// still call requireAdmin() first.

export type BrandOption = { id: string; name: string; isActive: boolean };
export type ModelOption = { id: string; brandId: string; name: string; isActive: boolean };
export type CarFormOptions = { brands: BrandOption[]; models: ModelOption[] };

/** Every brand and model, active or not; the form hides inactive ones unless a car already uses them. */
export async function getCarFormOptions(): Promise<CarFormOptions> {
  const supabase = await createSupabaseServerClient();
  const [brands, models] = await Promise.all([
    supabase.from('brands').select('id, name, is_active').order('name'),
    supabase.from('models').select('id, brand_id, name, is_active').order('name'),
  ]);
  if (brands.error) throw new Error(`Could not load brands: ${brands.error.message}`);
  if (models.error) throw new Error(`Could not load models: ${models.error.message}`);

  return {
    brands: brands.data.map((b) => ({ id: b.id, name: b.name, isActive: b.is_active })),
    models: models.data.map((m) => ({ id: m.id, brandId: m.brand_id, name: m.name, isActive: m.is_active })),
  };
}

export type CarPhoto = { path: string; url: string };

export type CarForEdit = {
  id: string;
  status: CarStatus;
  brandId: string;
  modelId: string;
  variant: string | null;
  slug: string;
  price: number;
  originalPrice: number | null;
  year: number;
  kmsDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  engineCc: number | null;
  owners: number;
  color: string | null;
  registrationState: string | null;
  registrationCity: string | null;
  description: string | null;
  featured: boolean;
  publishedAt: string | null;
  soldAt: string | null;
  updatedAt: string;
  features: string[];
  /** Cover photo first, then sort order. */
  photos: CarPhoto[];
};

export async function getCarForEdit(id: string): Promise<CarForEdit | null> {
  const supabase = await createSupabaseServerClient();
  const { data: car, error } = await supabase
    .from('cars')
    .select(
      'id, status, brand_id, model_id, variant, slug, price, original_price, year, kms_driven, fuel_type, transmission, body_type, engine_cc, owners, color, registration_state, registration_city, description, featured, published_at, sold_at, updated_at, car_features(feature_name), car_images(storage_path, image_url, sort_order, is_primary)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load car: ${error.message}`);
  if (!car) return null;

  const photos = [...car.car_images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((img) => ({ path: img.storage_path, url: img.image_url }));

  return {
    id: car.id,
    status: car.status,
    brandId: car.brand_id,
    modelId: car.model_id,
    variant: car.variant,
    slug: car.slug,
    price: car.price,
    originalPrice: car.original_price,
    year: car.year,
    kmsDriven: car.kms_driven,
    fuelType: car.fuel_type,
    transmission: car.transmission,
    bodyType: car.body_type,
    engineCc: car.engine_cc,
    owners: car.owners,
    color: car.color,
    registrationState: car.registration_state,
    registrationCity: car.registration_city,
    description: car.description,
    featured: car.featured,
    publishedAt: car.published_at,
    soldAt: car.sold_at,
    updatedAt: car.updated_at,
    features: car.car_features.map((f) => f.feature_name).sort((a, b) => a.localeCompare(b)),
    photos,
  };
}

// ---------------------------------------------------------------------------
// Inventory list (/admin/cars)
// ---------------------------------------------------------------------------

export type InventoryCar = {
  id: string;
  slug: string;
  title: string;
  variant: string | null;
  price: number;
  year: number;
  kmsDriven: number;
  status: CarStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  coverUrl: string | null;
};

export type InventoryCounts = Record<CarStatus | 'all', number>;

export type Inventory = {
  cars: InventoryCar[];
  counts: InventoryCounts;
  /** Cars in the current tab, after search and filters. */
  total: number;
  page: number;
  pageCount: number;
  brands: { id: string; name: string }[];
};

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const SORT_COLUMNS: Record<
  InventorySort,
  { column: 'updated_at' | 'created_at' | 'price' | 'year'; ascending: boolean }
> = {
  updated: { column: 'updated_at', ascending: false },
  created: { column: 'created_at', ascending: false },
  price_desc: { column: 'price', ascending: false },
  price_asc: { column: 'price', ascending: true },
  year_desc: { column: 'year', ascending: false },
};

/**
 * PostgREST `or` filter for the search box: every word must match the
 * brand, model, variant or year. Brand and model names live in their own
 * (small) tables, so words are matched against those here and turned into
 * id lists. Returns null when there is nothing to search for.
 */
function searchFilter(
  tokens: string[],
  brands: { id: string; name: string }[],
  models: { id: string; name: string }[],
) {
  if (tokens.length === 0) return null;
  const clauses = tokens.map((token) => {
    const parts = [`variant.ilike.*${token}*`];
    const brandIds = brands.filter((b) => b.name.toLowerCase().includes(token)).map((b) => b.id);
    const modelIds = models.filter((m) => m.name.toLowerCase().includes(token)).map((m) => m.id);
    if (brandIds.length) parts.push(`brand_id.in.(${brandIds.join(',')})`);
    if (modelIds.length) parts.push(`model_id.in.(${modelIds.join(',')})`);
    if (/^\d{4}$/.test(token)) parts.push(`year.eq.${token}`);
    return `or(${parts.join(',')})`;
  });
  return `and(${clauses.join(',')})`;
}

export async function getInventory(params: InventoryParams): Promise<Inventory> {
  const supabase = await createSupabaseServerClient();
  const [brandsRes, modelsRes] = await Promise.all([
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('models').select('id, name'),
  ]);
  if (brandsRes.error) throw new Error(`Could not load brands: ${brandsRes.error.message}`);
  if (modelsRes.error) throw new Error(`Could not load models: ${modelsRes.error.message}`);

  const search = searchFilter(inventorySearchTokens(params.q), brandsRes.data, modelsRes.data);

  /** Search and filters, but not the status tab. Shared by the counts and the list. */
  function filtered<Q extends { or(f: string): Q; eq(c: string, v: string): Q }>(query: Q): Q {
    let q = query;
    if (search) q = q.or(search);
    if (params.brand) q = q.eq('brand_id', params.brand);
    if (params.fuel) q = q.eq('fuel_type', params.fuel);
    if (params.transmission) q = q.eq('transmission', params.transmission);
    return q;
  }

  const counts = await countByStatus(supabase, filtered);
  const total = params.status ? counts[params.status] : counts.all;
  const pageCount = Math.max(1, Math.ceil(total / INVENTORY_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const from = (page - 1) * INVENTORY_PAGE_SIZE;
  const sort = SORT_COLUMNS[params.sort];

  let cars: InventoryCar[] = [];
  if (total > 0) {
    let query = filtered(
      supabase
        .from('cars')
        .select(
          'id, slug, variant, price, year, kms_driven, status, featured, created_at, updated_at, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name), car_images(image_url)',
        ),
    )
      // Only the cover photo.
      .eq('car_images.is_primary', true)
      .limit(1, { referencedTable: 'car_images' });
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query
      .order(sort.column, { ascending: sort.ascending })
      // Stable order across pages when the sort column ties.
      .order('id')
      .range(from, from + INVENTORY_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load cars: ${error.message}`);

    cars = data.map((car) => ({
      id: car.id,
      slug: car.slug,
      title: [car.year, car.brand?.name, car.model?.name].filter(Boolean).join(' '),
      variant: car.variant,
      price: car.price,
      year: car.year,
      kmsDriven: car.kms_driven,
      status: car.status,
      featured: car.featured,
      createdAt: car.created_at,
      updatedAt: car.updated_at,
      coverUrl: car.car_images[0]?.image_url ?? null,
    }));
  }

  return { cars, counts, total, page, pageCount, brands: brandsRes.data };
}

async function countByStatus(
  supabase: Client,
  filtered: <Q extends { or(f: string): Q; eq(c: string, v: string): Q }>(query: Q) => Q,
): Promise<InventoryCounts> {
  const results = await Promise.all(
    CAR_STATUSES.map(async (status) => {
      const { count, error } = await filtered(supabase.from('cars').select('id', { count: 'exact', head: true })).eq(
        'status',
        status,
      );
      if (error) throw new Error(`Could not count cars: ${error.message}`);
      return [status, count ?? 0] as const;
    }),
  );
  const counts = Object.fromEntries(results) as Record<CarStatus, number>;
  return { ...counts, all: results.reduce((sum, [, n]) => sum + n, 0) };
}
