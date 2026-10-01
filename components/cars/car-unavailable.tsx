import Link from 'next/link';
import { buttonStyles, EmptyState } from '@/components/ui';
import { CarIcon, QuoteIcon } from '@/components/ui/icons';
import { BODY_TYPE_LABELS } from '@/lib/car-options';
import { whatsappHref } from '@/lib/contact';
import { formatPriceLakh } from '@/lib/format';
import { getSimilarCars, type UnavailableCar } from '@/lib/queries/car-detail';
import type { SiteSettings } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';
import { SimilarCars } from './similar-cars';

/** A sold or archived car's old URL: say so, then offer similar cars (same body type or price band). */
export async function CarUnavailable({ car, settings }: { car: UnavailableCar; settings: SiteSettings }) {
  const similar = await getSimilarCars({ bodyType: car.bodyType, price: car.price }, false);
  const name = [car.title, car.variant].filter(Boolean).join(' ');
  const whatsapp = whatsappHref(
    settings.whatsappNumber,
    `Hi, I was looking at the ${name}, which is no longer available. Do you have anything similar around ${formatPriceLakh(car.price)}?`,
  );

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-chip text-muted" aria-hidden>
          <CarIcon width={22} height={22} />
        </span>
        <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">
          {car.status === 'sold' ? `This ${car.title} has been sold` : `This ${car.title} is no longer available`}
        </h1>
        <p className="max-w-2xl text-body-lg text-muted">
          {similar.length > 0
            ? `Here are cars you can see today: other ${BODY_TYPE_LABELS[car.bodyType]} models and cars around ${formatPriceLakh(car.price)}.`
            : 'New cars arrive often. Browse what we have now, or tell us what you are looking for.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/cars" className={buttonStyles()}>
            Browse all cars
          </Link>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener" className={buttonStyles({ variant: 'whatsapp' })}>
              <QuoteIcon width={18} height={18} />
              Ask for something similar
            </a>
          )}
        </div>
      </header>
      <SimilarCars cars={similar} now={getRequestTime()} title="Similar cars available now" />
    </div>
  );
}

/** Unknown or draft slug: the 404 page, with the newest cars. */
export function CarNotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <EmptyState
        icon={<CarIcon width={22} height={22} />}
        title="We couldn't find that car"
        description="It may have been sold, or the link may be wrong."
        action={
          <Link href="/cars" className={buttonStyles()}>
            Browse all cars
          </Link>
        }
      />
      {children}
    </div>
  );
}
