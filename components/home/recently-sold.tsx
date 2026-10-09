import { CarRow } from '@/components/cars/car-row';
import type { SoldCarCard } from '@/lib/queries/homepage';
import { HomeSection } from './section';

/** Cars sold lately, newest sale first. Hidden when there are none. Cards open the "sold" page, never an enquiry. */
export function RecentlySold({ cars, now }: { cars: SoldCarCard[]; now: number }) {
  if (cars.length === 0) return null;
  return (
    <HomeSection id="recently-sold" title="Recently sold" description="Cars that found a new home with us." tone="wash">
      <CarRow cars={cars} now={now} sold />
    </HomeSection>
  );
}
