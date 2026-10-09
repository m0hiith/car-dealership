import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CarsListing } from '@/components/cars/cars-listing';
import { getPublicBrand } from '@/lib/queries/public-cars';
import { getSiteSettings } from '@/lib/queries/settings';
import { landingPath, pageMetadata, SEO_CITY } from '@/lib/seo';
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
  const [brand, settings] = await Promise.all([loadBrand(params), getSiteSettings()]);
  return pageMetadata({
    title: `Used ${brand.name} Cars for Sale in ${SEO_CITY}`,
    description: `Browse pre-owned ${brand.name} cars in stock in ${SEO_CITY}, with prices, photos and full details.`,
    // The filterable listing and /used-cars/<brand> show the same stock; the landing page is the one to rank.
    path: landingPath({ kind: 'brand', slug: brand.slug }),
    siteName: settings.dealershipName,
    image: settings.logoUrl,
  });
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
