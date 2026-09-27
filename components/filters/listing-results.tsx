'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CarGridSkeleton } from '@/components/cars/car-grid';
import { buttonStyles } from '@/components/ui';
import { Spinner } from '@/components/ui/icons';
import { PUBLIC_CARS_MAX_PAGE } from '@/lib/validation/public-cars';
import { useListing } from './listing-context';

/** Shows skeletons while new results load. The results themselves are server-rendered children. */
export function ListingResults({ children }: { children: ReactNode }) {
  const { pending } = useListing();
  return (
    <div aria-busy={pending !== null} className="flex flex-col gap-6">
      {pending === 'filter' ? <CarGridSkeleton /> : children}
      {pending === 'more' && <CarGridSkeleton count={3} />}
    </div>
  );
}

/** Adds the next 20 cars. The page number is in the URL, so a shared or reloaded link shows the same cars. */
export function LoadMore({ shown }: { shown: number }) {
  const { state, total, pending, href, update } = useListing();
  if (shown >= total || state.page >= PUBLIC_CARS_MAX_PAGE) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-body-md text-muted">
        Showing {shown} of {total} cars
      </p>
      {/* A real link, so it works before JavaScript loads and crawlers can follow it. */}
      <Link
        href={href({ page: state.page + 1 })}
        scroll={false}
        aria-disabled={pending === 'more' || undefined}
        onClick={(e) => {
          e.preventDefault();
          update({ page: state.page + 1 }, 'more');
        }}
        className={buttonStyles({ variant: 'ghost', size: 'lg', className: 'bg-card' })}
      >
        {pending === 'more' && <Spinner />}
        Load more cars
      </Link>
    </div>
  );
}
