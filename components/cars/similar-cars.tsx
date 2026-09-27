import type { PublicCarCard } from '@/lib/queries/public-cars';
import { CarCard } from './car-card';

/** A swipeable row on phones; a grid from tablets up. */
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
      <ul className="-mx-4 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {cars.map((car) => (
          <li key={car.id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto">
            <CarCard car={car} now={now} titleAs="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
