import Image from 'next/image';
import Link from 'next/link';
import { Card, Skeleton } from '@/components/ui';
import { ImageIcon } from '@/components/ui/icons';
import { carBadges } from '@/lib/car-badges';
import { BODY_TYPE_LABELS, FUEL_LABELS, isAutomatic, OWNER_LABELS } from '@/lib/car-options';
import { cn } from '@/lib/cn';
import { formatDate, formatKm, formatPriceLakh } from '@/lib/format';
import { carImageAlt } from '@/lib/seo';
import type { PublicCarCard } from '@/lib/queries/public-cars';
import { CarBadges } from './car-badges';

/** Matches CAR_GRID_CLASS: 1 column on phones, 2 on tablets, 3 beside the desktop filter sidebar. */
export const CAR_CARD_SIZES = '(min-width: 1200px) 300px, (min-width: 768px) 50vw, 100vw';

export type CarCardProps = {
  car: PublicCarCard;
  /** The likely LCP image: loaded eagerly at high priority. Everything else is lazy. */
  eager?: boolean;
  now: number;
  /** h3 when the cards sit under their own section heading. */
  titleAs?: 'h2' | 'h3';
  /** A sold car: muted photo, SOLD ribbon, no badges, and the sale date under the price. */
  sold?: { soldAt: string | null };
};

/** The whole card links to the detail page. */
export function CarCard({ car, eager = false, now, titleAs: Title = 'h2', sold }: CarCardProps) {
  const specs = [
    formatKm(car.kmsDriven),
    FUEL_LABELS[car.fuelType],
    isAutomatic(car.transmission) ? 'Automatic' : 'Manual',
    OWNER_LABELS[Math.min(car.owners, 6)],
  ];

  return (
    <Link
      href={`/cars/${car.slug}`}
      aria-label={sold ? `${car.title}, sold` : undefined}
      className="group block h-full rounded-card focus-ring transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none"
    >
      <Card interactive padding="none" className="flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/10] overflow-hidden bg-chip">
          {car.coverUrl ? (
            <Image
              src={car.coverUrl}
              alt={carImageAlt({
                name: [car.title, car.variant].filter(Boolean).join(' '),
                fuelType: car.fuelType,
                transmission: car.transmission,
              })}
              fill
              sizes={CAR_CARD_SIZES}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : undefined}
              className={cn('object-cover', sold && 'opacity-70 grayscale')}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <ImageIcon width={32} height={32} />
              <span className="sr-only">Photos coming soon</span>
            </div>
          )}
          {sold ? (
            <span
              className="absolute top-6 -left-11 w-40 -rotate-45 bg-brand py-1 text-center text-label-md font-extrabold tracking-widest text-white uppercase shadow-level-1"
              aria-hidden
            >
              Sold
            </span>
          ) : (
            <CarBadges badges={carBadges(car, now)} className="absolute top-3 right-3 left-3" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          {car.brand && (
            <p className="flex items-center gap-2 text-label-md font-bold tracking-wide text-navy uppercase">
              <span className="truncate">{car.brand}</span>
              <span aria-hidden className="text-control">
                ·
              </span>
              <span className="shrink-0 text-action-ink">{BODY_TYPE_LABELS[car.bodyType]}</span>
            </p>
          )}
          <Title className="text-headline-sm text-navy group-hover:text-action-ink">
            {car.brand && car.model ? `${car.year} ${car.model}` : car.title}
          </Title>
          <p className="truncate text-body-md text-muted">{car.variant || ' '}</p>
          <p className="mt-1 text-body-sm text-chip-ink">
            {specs.map((spec, i) => (
              <span key={spec} className="whitespace-nowrap">
                {i > 0 && (
                  <span className="mx-1.5 text-control" aria-hidden>
                    ·
                  </span>
                )}
                <span className={i === 0 ? 'font-semibold' : undefined}>{spec}</span>
              </span>
            ))}
          </p>
          <p className={cn('mt-auto pt-3 text-headline-lg-mobile price-figure', sold && 'text-muted')}>
            {formatPriceLakh(car.price)}
          </p>
          {sold && (
            <p className="text-body-sm font-semibold text-chip-ink">
              Sold{sold.soldAt ? ` on ${formatDate(sold.soldAt)}` : ''}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function CarCardSkeleton() {
  return (
    <Card padding="none" className="flex h-full flex-col overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-3 h-7 w-1/3" />
      </div>
    </Card>
  );
}
