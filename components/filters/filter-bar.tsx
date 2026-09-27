'use client';

import { useEffect, useState } from 'react';
import { Button, Chip } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CheckIcon, ChevronDownIcon, Spinner } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  PUBLIC_SORTS,
  type CarFilters,
  type PublicSort,
} from '@/lib/validation/public-cars';
import { FILTER_SECTIONS, FilterPanel, filterSectionId, type FilterSectionKey } from './filter-panel';
import { useListing } from './listing-context';
import { SortSelect, SORT_OPTIONS } from './sort-select';

const SHEET_PREFIX = 'sheet';

/** Which chip in the tablet bar is lit for each section. */
function sectionActive(key: FilterSectionKey, f: CarFilters): boolean {
  switch (key) {
    case 'price':
      return f.minPrice !== null || f.maxPrice !== null;
    case 'brand':
      return f.brands.length > 0;
    case 'model':
      return f.models.length > 0;
    case 'year':
      return f.minYear !== null;
    case 'km':
      return f.maxKm !== null;
    case 'fuel':
      return f.fuels.length > 0;
    case 'transmission':
      return f.transmissions.length > 0;
    case 'body':
      return f.bodyTypes.length > 0;
    case 'owners':
      return f.owners.length > 0;
    case 'colour':
      return f.colours.length > 0;
  }
}

/**
 * Filters below 1200px. Phones: a sticky [Filter] [Sort] bar. Tablets: a
 * scrolling row of filter chips plus the sort select. Both open the same
 * bottom sheet (tablet chips jump to their section).
 */
export function FilterBar() {
  const { state, fixed, effective, total, pending, update } = useListing();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<FilterSectionKey | null>(null);
  const active = countActiveFilters(state.filters);

  useEffect(() => {
    if (!filtersOpen || !jumpTo) return;
    // After the sheet has opened and laid out.
    const frame = requestAnimationFrame(() =>
      document.getElementById(filterSectionId(SHEET_PREFIX, jumpTo))?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [filtersOpen, jumpTo]);

  function openFilters(section: FilterSectionKey | null = null) {
    setJumpTo(section);
    setFiltersOpen(true);
  }

  const sections = (Object.keys(FILTER_SECTIONS) as FilterSectionKey[]).filter(
    (key) =>
      !(key === 'brand' && fixed.brands) &&
      !(key === 'body' && fixed.bodyTypes) &&
      !(key === 'model' && effective.brands.length === 0),
  );

  return (
    <>
      {/* Phones */}
      <div className="sticky top-0 z-20 -mx-4 flex gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur md:hidden">
        <Button variant="ghost" className="flex-1 bg-card" onClick={() => openFilters()}>
          Filter
          {active > 0 && (
            <span className="rounded-full bg-navy px-2 py-0.5 text-label-sm text-white tabular-nums">{active}</span>
          )}
        </Button>
        <Button variant="ghost" className="flex-1 bg-card" onClick={() => setSortOpen(true)}>
          Sort
          <ChevronDownIcon width={16} height={16} />
        </Button>
      </div>

      {/* Tablets */}
      <div className="hidden items-center gap-3 md:flex lg:hidden">
        <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
          <Chip selected={active > 0} onClick={() => openFilters()}>
            All filters{active > 0 ? ` (${active})` : ''}
          </Chip>
          {sections.map((key) => (
            <Chip key={key} selected={sectionActive(key, state.filters)} onClick={() => openFilters(key)}>
              {FILTER_SECTIONS[key]}
              <ChevronDownIcon width={14} height={14} />
            </Chip>
          ))}
        </div>
        <SortSelect className="w-52" />
      </div>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <>
            <Button variant="ghost" disabled={active === 0} onClick={() => update({ filters: EMPTY_FILTERS })}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              {pending ? <Spinner /> : `Show ${total} ${total === 1 ? 'car' : 'cars'}`}
            </Button>
          </>
        }
      >
        <FilterPanel idPrefix={SHEET_PREFIX} />
      </BottomSheet>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <ul className="flex flex-col gap-1" role="radiogroup" aria-label="Sort by">
          {SORT_OPTIONS.map((option) => {
            const selected = state.sort === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setSortOpen(false);
                    if (!selected) update({ sort: option.value as PublicSort });
                  }}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between rounded-control px-3 text-left text-body-lg focus-ring transition-colors hover:bg-chip',
                    selected ? 'font-semibold text-action-ink' : 'text-chip-ink',
                  )}
                >
                  {PUBLIC_SORTS[option.value as PublicSort]}
                  {selected && <CheckIcon width={18} height={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
