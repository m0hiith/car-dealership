'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useOptimistic, useState, useTransition, type ReactNode } from 'react';
import type { CarFacets } from '@/lib/queries/public-cars';
import {
  listingHref,
  withFixed,
  type CarFilters,
  type FixedFilters,
  type ListingChanges,
  type ListingState,
} from '@/lib/validation/public-cars';

type PendingKind = 'filter' | 'more';

type ListingContextValue = {
  basePath: string;
  /** URL state, updated optimistically while the new results load. */
  state: ListingState;
  /** Filters fixed by the page (brand or body type pages). */
  fixed: FixedFilters;
  /** URL filters plus fixed ones: what the results are filtered by. */
  effective: CarFilters;
  facets: CarFacets;
  total: number;
  pending: PendingKind | null;
  href: (changes: ListingChanges) => string;
  update: (changes: ListingChanges, kind?: PendingKind) => void;
};

const ListingContext = createContext<ListingContextValue | null>(null);

export function useListing() {
  const ctx = useContext(ListingContext);
  if (!ctx) throw new Error('useListing must be used inside <ListingProvider>');
  return ctx;
}

/**
 * Shared state for the filter controls. Every change is a navigation (push,
 * so Back undoes it); the server renders the new results. Controls read the
 * optimistic state so they respond instantly.
 */
export function ListingProvider({
  basePath,
  state,
  fixed,
  facets,
  total,
  children,
}: {
  basePath: string;
  state: ListingState;
  fixed: FixedFilters;
  facets: CarFacets;
  total: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<PendingKind>('filter');
  const [optimistic, setOptimistic] = useOptimistic(state);

  const href = (changes: ListingChanges) => listingHref(basePath, optimistic, changes);

  function update(changes: ListingChanges, pendingKind: PendingKind = 'filter') {
    const next: ListingState = {
      filters: { ...optimistic.filters, ...changes.filters },
      sort: changes.sort ?? optimistic.sort,
      page: changes.page ?? 1,
    };
    const url = listingHref(basePath, optimistic, changes);
    setKind(pendingKind);
    startTransition(() => {
      setOptimistic(next);
      router.push(url, { scroll: false });
    });
  }

  return (
    <ListingContext.Provider
      value={{
        basePath,
        state: optimistic,
        fixed,
        effective: withFixed(optimistic.filters, fixed),
        facets,
        total,
        pending: isPending ? kind : null,
        href,
        update,
      }}
    >
      {children}
    </ListingContext.Provider>
  );
}
