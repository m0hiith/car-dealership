import 'server-only';
import type { BodyType, CarStatus, FuelType, Transmission } from '@/lib/car-options';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
