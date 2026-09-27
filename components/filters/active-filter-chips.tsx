'use client';

import { Chip } from '@/components/ui';
import { activeFilters, EMPTY_FILTERS } from '@/lib/validation/public-cars';
import { useListing } from './listing-context';

/** Removable chips for the filters in the URL, plus "Clear all". */
export function ActiveFilterChips() {
  const { state, facets, update } = useListing();
  const chips = activeFilters(state.filters, facets);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Active filters:</span>
      {chips.map((chip) => (
        <Chip key={chip.key} onRemove={() => update({ filters: chip.remove })} aria-label={`Remove ${chip.label}`}>
          {chip.label}
        </Chip>
      ))}
      <button
        type="button"
        onClick={() => update({ filters: EMPTY_FILTERS })}
        className="ml-1 rounded-control px-1 text-label-lg text-action focus-ring hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
