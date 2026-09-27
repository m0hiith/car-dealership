'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@/components/ui';
import { SearchIcon, Spinner } from '@/components/ui/icons';
import { FUEL_LABELS, FUEL_TYPES, TRANSMISSION_LABELS, TRANSMISSIONS } from '@/lib/car-options';
import {
  hasInventoryFilters,
  INVENTORY_SORTS,
  inventoryHref,
  type InventoryParams,
  type InventorySort,
} from '@/lib/validation/admin-cars';

const FUEL_OPTIONS = FUEL_TYPES.map((v) => ({ value: v, label: FUEL_LABELS[v] }));
const TRANSMISSION_OPTIONS = TRANSMISSIONS.map((v) => ({ value: v, label: TRANSMISSION_LABELS[v] }));
const SORT_OPTIONS = Object.entries(INVENTORY_SORTS).map(([value, label]) => ({ value, label }));

/** Search, filters and sort. State lives in the URL; the server does the filtering. */
export function InventoryToolbar({
  params,
  brands,
}: {
  params: InventoryParams;
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q ?? '');
  // When q in the URL changes, the box follows it, unless this box is what
  // sent it (the user may have typed more while the page was loading).
  const [seenQ, setSeenQ] = useState(params.q);
  const [sentQ, setSentQ] = useState<string | undefined | null>(null);
  if (params.q !== seenQ) {
    setSeenQ(params.q);
    if (params.q === sentQ) setSentQ(null);
    else setQuery(params.q ?? '');
  }

  function go(changes: Partial<InventoryParams>) {
    startTransition(() => router.replace(inventoryHref(params, changes), { scroll: false }));
  }

  useEffect(() => {
    const q = query.trim() || undefined;
    if (q === params.q) return;
    const timer = window.setTimeout(() => {
      setSentQ(q);
      startTransition(() => router.replace(inventoryHref(params, { q }), { scroll: false }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, params, router]);

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative md:col-span-2 lg:col-span-1">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            label="Search cars"
            hideLabel
            placeholder="Search brand, model or variant"
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
          label="Brand"
          hideLabel
          placeholder="All brands"
          options={brandOptions}
          value={params.brand ?? ''}
          onChange={(e) => go({ brand: e.target.value || undefined })}
        />
        <Select
          label="Fuel"
          hideLabel
          placeholder="All fuels"
          options={FUEL_OPTIONS}
          value={params.fuel ?? ''}
          onChange={(e) => go({ fuel: (e.target.value || undefined) as InventoryParams['fuel'] })}
        />
        <Select
          label="Transmission"
          hideLabel
          placeholder="All transmissions"
          options={TRANSMISSION_OPTIONS}
          value={params.transmission ?? ''}
          onChange={(e) => go({ transmission: (e.target.value || undefined) as InventoryParams['transmission'] })}
        />
        <Select
          label="Sort by"
          hideLabel
          options={SORT_OPTIONS}
          value={params.sort}
          onChange={(e) => go({ sort: e.target.value as InventorySort })}
        />
      </div>
      {hasInventoryFilters(params) && (
        <div>
          <Link
            href={inventoryHref(params, { q: undefined, brand: undefined, fuel: undefined, transmission: undefined })}
            scroll={false}
            className="rounded-control text-label-lg text-action focus-ring hover:underline"
          >
            Clear search and filters
          </Link>
        </div>
      )}
    </div>
  );
}
