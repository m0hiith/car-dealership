import type { Metadata } from 'next';
import { CarsListing } from '@/components/cars/cars-listing';
import { getSiteSettings } from '@/lib/queries/settings';
import { pageMetadata, SEO_CITY } from '@/lib/seo';
import { parseListingState } from '@/lib/validation/public-cars';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return pageMetadata({
    title: `Used Cars for Sale in ${SEO_CITY}`,
    description: `Browse every pre-owned car in stock${settings.dealershipName ? ` at ${settings.dealershipName}` : ''}. Filter by price, brand, year, fuel, transmission and more.`,
    // Filtered and sorted variants are the same page for search engines.
    path: '/cars',
    siteName: settings.dealershipName,
    image: settings.logoUrl,
  });
}

export default async function CarsPage({ searchParams }: PageProps<'/cars'>) {
  const state = parseListingState(await searchParams);
  return <CarsListing basePath="/cars" state={state} title="Used cars for sale" />;
}
