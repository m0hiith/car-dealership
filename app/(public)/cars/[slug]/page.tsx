import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CarBadges } from '@/components/cars/car-badges';
import { CarUnavailable } from '@/components/cars/car-unavailable';
import { ContactActions } from '@/components/cars/contact-actions';
import { Gallery } from '@/components/cars/gallery';
import { ReservedBanner } from '@/components/cars/reserved-banner';
import { SimilarCars } from '@/components/cars/similar-cars';
import { SpecChips } from '@/components/cars/spec-chips';
import { Description, FeatureList, VehicleDetails } from '@/components/cars/vehicle-details';
import { StickyCtaBar } from '@/components/layout/sticky-cta-bar';
import { EnquiryProvider } from '@/components/leads/enquiry';
import { Card } from '@/components/ui';
import { ChevronRightIcon } from '@/components/ui/icons';
import { carBadges } from '@/lib/car-badges';
import { carEnquiryMessage, carFollowUpMessage, carWhatsappMessage } from '@/lib/car-enquiry';
import { FUEL_LABELS, isAutomatic } from '@/lib/car-options';
import { telHref, whatsappHref } from '@/lib/contact';
import { formatKm, formatPriceFull, formatPriceLakh } from '@/lib/format';
import { getPublicCarBySlug, getSimilarCars, getUnavailableCar } from '@/lib/queries/car-detail';
import { getSiteSettings } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';
import { absoluteUrl } from '@/lib/site-url';
import { SLUG_PATTERN } from '@/lib/slug';

// Pages are rendered on first visit, then served from cache until staff
// change a car (tag revalidation). The hourly refresh keeps the time-based
// New Arrival badge honest.
export const revalidate = 3600;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

async function readSlug(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  if (slug.length > 120 || !SLUG_PATTERN.test(slug)) notFound();
  return slug;
}

export async function generateMetadata({ params }: PageProps<'/cars/[slug]'>): Promise<Metadata> {
  const slug = await readSlug(params);
  const car = await getPublicCarBySlug(slug);
  if (!car) {
    const gone = await getUnavailableCar(slug);
    return gone ? { title: `${gone.title} (no longer available)`, robots: { index: false } } : {};
  }

  const name = [car.title, car.variant].filter(Boolean).join(' ');
  const specs = [
    formatKm(car.kmsDriven),
    FUEL_LABELS[car.fuelType],
    isAutomatic(car.transmission) ? 'Automatic' : 'Manual',
  ].join(', ');
  const description = `Used ${name} for ${formatPriceLakh(car.price)}: ${specs}. See photos and full details, and enquire today.`;
  const cover = car.photos[0]?.url;
  return {
    title: `${name} for sale`,
    description,
    alternates: { canonical: `/cars/${car.slug}` },
    openGraph: { title: name, description, url: `/cars/${car.slug}`, images: cover ? [{ url: cover }] : undefined },
  };
}

export default async function CarDetailPage({ params }: PageProps<'/cars/[slug]'>) {
  const slug = await readSlug(params);
  const [car, settings] = await Promise.all([getPublicCarBySlug(slug), getSiteSettings()]);

  // Sold or archived: a friendly page (the proxy sends it as 410 Gone).
  // Draft or unknown: 404.
  if (!car) {
    const gone = await getUnavailableCar(slug);
    if (!gone) notFound();
    return <CarUnavailable car={gone} settings={settings} />;
  }

  const now = getRequestTime();
  const similar = await getSimilarCars({ bodyType: car.bodyType, price: car.price, excludeId: car.id }, true);
  const url = absoluteUrl(`/cars/${car.slug}`);
  const links = {
    whatsapp: whatsappHref(settings.whatsappNumber, carWhatsappMessage(car, url)),
    call: telHref(settings.phone),
  };
  const reserved = car.status === 'reserved';

  return (
    <EnquiryProvider
      title={reserved ? 'Ask about similar cars' : 'Enquire about this car'}
      description={[car.title, car.variant].filter(Boolean).join(' ')}
      form={{
        carSlug: car.slug,
        defaultMessage: carEnquiryMessage(car),
        whatsappHref: whatsappHref(settings.whatsappNumber, carFollowUpMessage(car, url)),
      }}
    >
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-4 md:gap-8 md:px-6 md:py-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-body-md text-muted">
            <li>
              <Link href="/cars" className="rounded-control focus-ring hover:text-action-ink hover:underline">
                Used cars
              </Link>
            </li>
            {car.brand && (
              <li className="flex items-center gap-1">
                <ChevronRightIcon aria-hidden />
                <Link
                  href={`/cars/brand/${car.brand.slug}`}
                  className="rounded-control focus-ring hover:text-action-ink hover:underline"
                >
                  {car.brand.name}
                </Link>
              </li>
            )}
            <li className="flex items-center gap-1">
              <ChevronRightIcon aria-hidden />
              <span aria-current="page" className="text-chip-ink">
                {car.title}
              </span>
            </li>
          </ol>
        </nav>

        {reserved && <ReservedBanner />}

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
          <div className="lg:col-start-1">
            <Gallery photos={car.photos} alt={[car.title, car.variant].filter(Boolean).join(' ')} />
          </div>

          <Card
            padding="none"
            className="flex flex-col gap-4 p-4 md:p-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <CarBadges badges={carBadges(car, now)} />
            <div className="flex flex-col gap-1">
              <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">{car.title}</h1>
              {car.variant && <p className="text-body-lg text-muted">{car.variant}</p>}
            </div>
            <div>
              <p className="text-headline-lg-mobile font-extrabold text-navy tabular-nums md:text-headline-lg">
                {formatPriceFull(car.price)}
              </p>
              <p className="text-body-md text-muted tabular-nums">{formatPriceLakh(car.price)}</p>
            </div>
            <SpecChips car={car} />
            <ContactActions {...links} className="hidden md:flex" />
          </Card>

          <div className="flex flex-col gap-6 lg:col-start-1">
            <VehicleDetails car={car} />
            <FeatureList features={car.features} />
            <Description text={car.description} />
          </div>
        </div>

        <SimilarCars cars={similar} now={now} />
      </div>
      <StickyCtaBar {...links} />
    </EnquiryProvider>
  );
}
