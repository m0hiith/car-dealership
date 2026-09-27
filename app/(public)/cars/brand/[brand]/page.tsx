import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CarsListing } from '@/components/cars/cars-listing';
import { getPublicBrand } from '@/lib/queries/public-cars';
import { SLUG_PATTERN } from '@/lib/slug';
import { parseListingState } from '@/lib/validation/public-cars';

async function loadBrand(params: Promise<{ brand: string }>) {
  const { brand: slug } = await params;
  if (slug.length > 80 || !SLUG_PATTERN.test(slug)) notFound();
  const brand = await getPublicBrand(slug);
  if (!brand) notFound();
  return brand;
}

export async function generateMetadata({ params }: PageProps<'/cars/brand/[brand]'>): Promise<Metadata> {
  const brand = await loadBrand(params);
  return {
    title: `Used ${brand.name} cars for sale`,
    description: `Browse pre-owned ${brand.name} cars in stock, with prices, photos and full details.`,
    alternates: { canonical: `/cars/brand/${brand.slug}` },
  };
}

export default async function BrandCarsPage({ params, searchParams }: PageProps<'/cars/brand/[brand]'>) {
  const [brand, raw] = await Promise.all([loadBrand(params), searchParams]);
  return (
    <CarsListing
      basePath={`/cars/brand/${brand.slug}`}
      state={parseListingState(raw)}
      fixed={{ brands: [brand.slug] }}
      fixedLabel={brand.name}
      title={`Used ${brand.name} cars`}
    />
  );
}
