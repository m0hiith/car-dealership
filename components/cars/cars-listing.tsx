import Link from 'next/link';
import type { ReactNode } from 'react';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FilterBar } from '@/components/filters/filter-bar';
import { FilterPanel } from '@/components/filters/filter-panel';
import { ListingProvider } from '@/components/filters/listing-context';
import { ListingResults, LoadMore } from '@/components/filters/listing-results';
import { SortSelect } from '@/components/filters/sort-select';
import { buttonStyles, Card, EmptyState } from '@/components/ui';
import { CarIcon, QuoteIcon, SearchIcon } from '@/components/ui/icons';
import { whatsappHref } from '@/lib/contact';
import { getCarFacets, getPublicCars } from '@/lib/queries/public-cars';
import { getSiteSettings } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';
import {
  activeFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  listingHref,
  PUBLIC_CARS_PAGE_SIZE,
  toRpcFilters,
  withFixed,
  type FixedFilters,
  type ListingState,
} from '@/lib/validation/public-cars';
import { CarGrid } from './car-grid';

export type CarsListingProps = {
  /** /cars, /cars/brand/bmw, /cars/type/suv: filter links stay on this path. */
  basePath: string;
  state: ListingState;
  /** Filters the page itself applies; hidden from the panel and the chips. */
  fixed?: FixedFilters;
  title: string;
  intro?: ReactNode;
  /** What the fixed filter is called ("BMW", "SUV"), for the WhatsApp message. */
  fixedLabel?: string;
};

/** The /cars listing: filters in the URL, filtering and sorting in Postgres. */
export async function CarsListing({ basePath, state: raw, fixed = {}, title, intro, fixedLabel }: CarsListingProps) {
  // The URL does not own the fixed filters (/cars/brand/bmw?brand=audi is still BMW).
  const state: ListingState = {
    ...raw,
    filters: {
      ...raw.filters,
      ...(fixed.brands && { brands: [] }),
      ...(fixed.bodyTypes && { bodyTypes: [] }),
    },
  };
  const rpc = toRpcFilters(withFixed(state.filters, fixed));

  const [list, facets, settings] = await Promise.all([
    getPublicCars(rpc, state.sort, state.page * PUBLIC_CARS_PAGE_SIZE),
    getCarFacets(rpc),
    getSiteSettings(),
  ]);

  const now = getRequestTime();
  const filtered = countActiveFilters(state.filters) > 0;
  const summary = [fixedLabel, ...activeFilters(state.filters, facets).map((f) => f.label)].filter(Boolean);
  const whatsapp = whatsappHref(
    settings.whatsappNumber,
    summary.length
      ? `Hi, I'm looking for a car (${summary.join(', ')}). Do you have anything similar?`
      : `Hi, I'm looking for a car. Can you help?`,
  );
  const whatsappCta = whatsapp && (
    <a href={whatsapp} target="_blank" rel="noopener" className={buttonStyles({ variant: 'whatsapp' })}>
      <QuoteIcon width={18} height={18} />
      Tell us what you&apos;re looking for
    </a>
  );

  let results: ReactNode;
  if (list.cars.length > 0) {
    results = <CarGrid cars={list.cars} now={now} />;
  } else if (filtered) {
    results = (
      <EmptyState
        icon={<SearchIcon width={22} height={22} />}
        title="No cars match your filters"
        description={
          whatsappCta
            ? "Try removing a filter or two. Or tell us what you want and we'll let you know when it comes in."
            : 'Try removing a filter or two.'
        }
        action={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={listingHref(basePath, state, { filters: EMPTY_FILTERS })}
              scroll={false}
              className={buttonStyles({ variant: 'ghost' })}
            >
              Clear filters
            </Link>
            {whatsappCta}
          </div>
        }
      />
    );
  } else {
    results = (
      <EmptyState
        icon={<CarIcon width={22} height={22} />}
        title="No cars here right now"
        description={
          whatsappCta
            ? "New cars arrive often. Tell us what you want and we'll let you know."
            : 'New cars arrive often.'
        }
        action={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {basePath !== '/cars' && (
              <Link href="/cars" className={buttonStyles({ variant: 'ghost' })}>
                See all cars
              </Link>
            )}
            {whatsappCta}
          </div>
        }
      />
    );
  }

  return (
    <ListingProvider basePath={basePath} state={state} fixed={fixed} facets={facets} total={list.total}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-headline-xl-mobile text-navy md:text-headline-xl">{title}</h1>
          {intro && <div className="text-body-lg text-muted">{intro}</div>}
          <p className="text-body-md text-muted" aria-live="polite">
            <span className="font-semibold text-chip-ink tabular-nums">{list.total}</span>{' '}
            {list.total === 1 ? 'car' : 'cars'} available
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside
            aria-label="Filters"
            className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-card lg:block"
          >
            <Card padding="lg">
              <h2 className="mb-5 text-headline-md font-extrabold text-navy">Filters</h2>
              <FilterPanel idPrefix="sidebar" />
            </Card>
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <FilterBar />
            <div className="hidden items-center justify-end gap-3 lg:flex">
              <span className="text-label-md font-extrabold tracking-wider text-navy uppercase">Sort by</span>
              <SortSelect className="w-56" />
            </div>
            <ActiveFilterChips />
            <ListingResults>{results}</ListingResults>
            <LoadMore shown={list.cars.length} />
          </div>
        </div>
      </div>
    </ListingProvider>
  );
}
