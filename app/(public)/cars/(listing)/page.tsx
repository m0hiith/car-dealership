import type { Metadata } from 'next';
import { CarsListing } from '@/components/cars/cars-listing';
import { parseListingState } from '@/lib/validation/public-cars';

export const metadata: Metadata = {
  title: 'Used cars for sale',
  description: 'Browse our pre-owned cars. Filter by price, brand, year, fuel, transmission and more.',
  // Filtered and sorted variants are the same page for search engines.
  alternates: { canonical: '/cars' },
};

export default async function CarsPage({ searchParams }: PageProps<'/cars'>) {
  const state = parseListingState(await searchParams);
  return <CarsListing basePath="/cars" state={state} title="Used cars for sale" />;
}
