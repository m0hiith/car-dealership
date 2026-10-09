import type { PublicCarCard } from '@/lib/queries/public-cars';
import { CarCard } from './car-card';

/** A swipeable row of car cards on phones; a 2- then 3-column grid from tablets up. */
export function CarRow({
  cars,
  now,
  sold = false,
}: {
  cars: (PublicCarCard & { soldAt?: string | null })[];
  now: number;
  /** Render the cars as sold (homepage Recently Sold). */
  sold?: boolean;
}) {
  return (
    <ul className="-mx-4 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
      {cars.map((car) => (
        <li key={car.id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto">
          <CarCard car={car} now={now} titleAs="h3" sold={sold ? { soldAt: car.soldAt ?? null } : undefined} />
        </li>
      ))}
    </ul>
  );
}
