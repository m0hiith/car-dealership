'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useUrlSearch } from '@/components/admin/use-url-search';
import { Input, Select } from '@/components/ui';
import { SearchIcon, Spinner } from '@/components/ui/icons';
import type { LeadCarOption } from '@/lib/queries/admin-leads';
import { hasLeadFilters, leadsHref, type LeadsParams } from '@/lib/validation/admin-leads';

/** Search by name or phone, and filter by car. State lives in the URL; the server does the filtering. */
export function LeadsToolbar({ params, cars }: { params: LeadsParams; cars: LeadCarOption[] }) {
  const hrefFor = useCallback((q: string | undefined) => leadsHref(params, { q }), [params]);
  const { query, setQuery, pending, go } = useUrlSearch(params.q, hrefFor);

  const carOptions = cars.map((c) => ({
    value: c.id,
    label: `${[c.title, c.variant].filter(Boolean).join(' ')} (${c.leadCount})${c.status === 'sold' ? ' · sold' : ''}`,
  }));
  // A car picked from an old link may have lost its leads; keep it selectable.
  if (params.car && !cars.some((c) => c.id === params.car))
    carOptions.unshift({ value: params.car, label: 'Selected car' });

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="relative">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            label="Search leads"
            hideLabel
            placeholder="Search name or phone"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10 pl-10"
          />
          {pending && (
            <Spinner
              width={16}
              height={16}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted"
              aria-label="Updating results"
            />
          )}
        </div>
        <Select
          label="Car"
          hideLabel
          placeholder="All cars"
          options={carOptions}
          value={params.car ?? ''}
          onChange={(e) => go(leadsHref(params, { car: e.target.value || undefined }))}
        />
      </div>
      {hasLeadFilters(params) && (
        <div>
          <Link
            href={leadsHref(params, { q: undefined, car: undefined })}
            scroll={false}
            className="rounded-control text-label-lg text-action-ink focus-ring hover:underline"
          >
            Clear search and filters
          </Link>
        </div>
      )}
    </div>
  );
}
