import { CarNotFound } from '@/components/cars/car-unavailable';
import { SimilarCars } from '@/components/cars/similar-cars';
import { getPublicCars } from '@/lib/queries/public-cars';
import { getRequestTime } from '@/lib/request-time';
import { PUBLIC_CARS_PAGE_SIZE } from '@/lib/validation/public-cars';

/** Draft or unknown car slug (404). Suggests the newest cars instead. */
export default async function CarNotFoundPage() {
  // Same arguments as the unfiltered /cars page, so it shares that cache entry.
  const { cars } = await getPublicCars({}, 'newest', PUBLIC_CARS_PAGE_SIZE);
  return (
    <CarNotFound>
      <SimilarCars cars={cars.slice(0, 6)} now={getRequestTime()} title="Latest cars" />
    </CarNotFound>
  );
}
