import { Badge } from '@/components/ui';
import { FUEL_LABELS, isAutomatic, OWNER_LABELS } from '@/lib/car-options';
import { formatKm } from '@/lib/format';
import type { PublicCarDetail } from '@/lib/queries/car-detail';

/** "TS · Hyderabad", or whichever part is set. */
export function registrationLabel(car: Pick<PublicCarDetail, 'registrationState' | 'registrationCity'>) {
  return [car.registrationState, car.registrationCity].filter(Boolean).join(' · ') || null;
}

/** Key facts as pills under the title: km, fuel, gearbox, owners, registration. */
export function SpecChips({ car }: { car: PublicCarDetail }) {
  const registration = registrationLabel(car);
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Key specs">
      <li>
        <Badge size="spec" className="font-bold">
          {formatKm(car.kmsDriven)}
        </Badge>
      </li>
      <li>
        <Badge size="spec">{FUEL_LABELS[car.fuelType]}</Badge>
      </li>
      <li>
        <Badge size="spec">{isAutomatic(car.transmission) ? 'Automatic' : 'Manual'}</Badge>
      </li>
      <li>
        {/* 1st Owner is a factual trust signal, so it may use green (CLAUDE.md §4). */}
        <Badge size="spec" tone={car.owners === 1 ? 'green' : 'neutral'}>
          {car.owners === 1 ? '1st Owner' : OWNER_LABELS[Math.min(car.owners, 6)]}
        </Badge>
      </li>
      {registration && (
        <li>
          <Badge size="spec">{registration}</Badge>
        </li>
      )}
    </ul>
  );
}
