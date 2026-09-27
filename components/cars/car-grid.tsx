import type { PublicCarCard } from '@/lib/queries/public-cars';
import { CarCard, CarCardSkeleton } from './car-card';

/** 1 column on phones, 2 on tablets, 3 beside the desktop filter sidebar. */
export const CAR_GRID_CLASS = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3';

export function CarGrid({
  cars,
  now,
  eagerFirst = true,
}: {
  cars: PublicCarCard[];
  now: number;
  eagerFirst?: boolean;
}) {
  return (
    <ul className={CAR_GRID_CLASS}>
      {cars.map((car, i) => (
        <li key={car.id}>
          <CarCard car={car} now={now} eager={eagerFirst && i === 0} />
        </li>
      ))}
    </ul>
  );
}

export function CarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={CAR_GRID_CLASS} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <CarCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
