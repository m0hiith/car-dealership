import Link from 'next/link';
import { CarGrid } from '@/components/cars/car-grid';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonStyles, chipStyles } from '@/components/ui';
import { ChevronRightIcon } from '@/components/ui/icons';
import { BODY_TYPE_LABELS } from '@/lib/car-options';
import type { LandingPage } from '@/lib/queries/landing';
import { getRequestTime } from '@/lib/request-time';
import { breadcrumbJsonLd, landingHeading, landingIntro, landingPath, type Crumb, type Landing } from '@/lib/seo';

/** Where "See all" goes: the filterable listing for the same cars. */
function listingHref(landing: Landing): string {
  switch (landing.kind) {
    case 'all':
      return '/cars';
    case 'brand':
      return `/cars/brand/${landing.slug}`;
    case 'body':
      return `/cars/type/${landing.bodyType}`;
    case 'budget':
      return `/cars?max_price=${landing.lakh}`;
  }
}

function relatedLabel(landing: Landing, brandNames: Map<string, string>): string {
  switch (landing.kind) {
    case 'all':
      return 'All used cars';
    case 'brand':
      return brandNames.get(landing.slug) ?? landing.slug;
    case 'body':
      return BODY_TYPE_LABELS[landing.bodyType];
    case 'budget':
      return `Under ₹${landing.lakh} Lakh`;
  }
}

/** A generated landing page: breadcrumbs, H1, an intro written from stock, the cars, and related pages. */
export function LandingView({
  landing,
  page,
  dealershipName,
  related,
  brandNames,
}: {
  landing: Landing;
  page: LandingPage;
  dealershipName: string;
  /** Other landing pages with stock, for internal links. */
  related: Landing[];
  brandNames: Map<string, string>;
}) {
  const heading = landingHeading(landing, page.brandName);
  const crumbs: Crumb[] = [{ name: 'Home', path: '/' }];
  if (landing.kind !== 'all') crumbs.push({ name: 'Used cars in Hyderabad', path: '/used-cars-hyderabad' });
  crumbs.push({ name: heading, path: landingPath(landing) });
  const more = page.stats.total - page.cars.length;

  const groups = [
    { title: 'By budget', items: related.filter((l) => l.kind === 'budget') },
    { title: 'By body type', items: related.filter((l) => l.kind === 'body') },
    { title: 'By brand', items: related.filter((l) => l.kind === 'brand') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-body-md text-muted">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRightIcon aria-hidden />}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-chip-ink">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="rounded-control focus-ring hover:text-action-ink hover:underline">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">{heading}</h1>
        <p className="text-body-lg text-muted">{landingIntro(landing, page.stats, dealershipName, page.brandName)}</p>
      </header>

      <CarGrid cars={page.cars} now={getRequestTime()} />

      <Link href={listingHref(landing)} className={buttonStyles({ variant: 'ghost', className: 'self-start' })}>
        {more > 0 ? `See all ${page.stats.total} cars with filters` : 'Filter and sort these cars'}
      </Link>

      {groups.length > 0 && (
        <section aria-labelledby="related-heading" className="flex flex-col gap-4 border-t border-border pt-6">
          <h2 id="related-heading" className="text-headline-sm text-navy">
            More used cars in Hyderabad
          </h2>
          {groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-2">
              <h3 className="text-label-md text-muted uppercase">{g.title}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((l) => (
                  <li key={landingPath(l)}>
                    <Link href={landingPath(l)} className={chipStyles({ className: 'h-10 px-4 text-label-lg' })}>
                      {relatedLabel(l, brandNames)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
