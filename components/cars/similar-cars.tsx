import type { PublicCarCard } from '@/lib/queries/public-cars';
import { CarRow } from './car-row';

export function SimilarCars({
  cars,
  now,
  title = 'Similar cars',
}: {
  cars: PublicCarCard[];
  now: number;
  title?: string;
}) {
  if (cars.length === 0) return null;
  return (
    <section aria-labelledby="similar-cars" className="flex flex-col gap-4">
      <h2 id="similar-cars" className="text-headline-lg-mobile text-navy md:text-headline-lg">
        {title}
      </h2>
      <CarRow cars={cars} now={now} />
    </section>
  );
}
