import Link from 'next/link';
import { CarRow } from '@/components/cars/car-row';
import { ArrowRightIcon } from '@/components/ui/icons';
import type { PublicCarCard } from '@/lib/queries/public-cars';
import { HomeSection, sectionLinkClass } from './section';

/** Featured cars, or the newest ones when nothing is featured. Hidden with no stock. */
export function FeaturedCars({ cars, featured, now }: { cars: PublicCarCard[]; featured: boolean; now: number }) {
  if (cars.length === 0) return null;
  return (
    <HomeSection
      id="featured"
      title={featured ? 'Featured cars' : 'Latest arrivals'}
      className="bg-card"
      action={
        <Link href="/cars" className={sectionLinkClass}>
          View all cars
          <ArrowRightIcon width={16} height={16} />
        </Link>
      }
    >
      <CarRow cars={cars} now={now} />
    </HomeSection>
  );
}
