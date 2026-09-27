import { Card } from '@/components/ui';
import { CheckIcon } from '@/components/ui/icons';
import { BODY_TYPE_LABELS, FUEL_LABELS, isAutomatic, OWNER_LABELS, TRANSMISSION_LABELS } from '@/lib/car-options';
import { formatKm } from '@/lib/format';
import type { PublicCarDetail } from '@/lib/queries/car-detail';
import { registrationLabel } from './spec-chips';

function transmissionLabel(car: PublicCarDetail) {
  if (!isAutomatic(car.transmission)) return 'Manual';
  // "Automatic (CVT)" when staff recorded the gearbox type.
  return car.transmission === 'automatic' ? 'Automatic' : `Automatic (${TRANSMISSION_LABELS[car.transmission]})`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="none" className="p-4 md:p-6">
      <h2 className="mb-4 text-headline-md text-navy">{title}</h2>
      {children}
    </Card>
  );
}

/** Spec table: brand, model, variant, year, fuel, gearbox, engine, km, owners, colour, registration. */
export function VehicleDetails({ car }: { car: PublicCarDetail }) {
  const rows: [string, string | null][] = [
    ['Brand', car.brand?.name ?? null],
    ['Model', car.model],
    ['Variant', car.variant],
    ['Year', String(car.year)],
    ['Body type', BODY_TYPE_LABELS[car.bodyType]],
    ['Fuel', FUEL_LABELS[car.fuelType]],
    ['Transmission', transmissionLabel(car)],
    ['Engine', car.engineCc ? `${new Intl.NumberFormat('en-IN').format(car.engineCc)} cc` : null],
    ['Kilometres driven', formatKm(car.kmsDriven)],
    ['Owners', OWNER_LABELS[Math.min(car.owners, 6)]],
    ['Colour', car.colour],
    ['Registration', registrationLabel(car)],
  ];

  return (
    <Section title="Vehicle details">
      <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-border py-3">
              <dt className="text-body-md text-muted">{label}</dt>
              <dd className="text-right text-body-md font-semibold text-navy">{value}</dd>
            </div>
          ))}
      </dl>
    </Section>
  );
}

export function FeatureList({ features }: { features: string[] }) {
  if (features.length === 0) return null;
  return (
    <Section title="Features">
      <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-body-md text-chip-ink">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-action-soft text-action-ink">
              <CheckIcon width={14} height={14} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Description({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <Section title="Description">
      <p className="text-body-lg whitespace-pre-line text-chip-ink">{text.trim()}</p>
    </Section>
  );
}
