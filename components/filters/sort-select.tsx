'use client';

import { Select } from '@/components/ui';
import { PUBLIC_SORTS, type PublicSort } from '@/lib/validation/public-cars';
import { useListing } from './listing-context';

export const SORT_OPTIONS = Object.entries(PUBLIC_SORTS).map(([value, label]) => ({ value, label }));

export function SortSelect({ className }: { className?: string }) {
  const { state, update } = useListing();
  return (
    <Select
      label="Sort by"
      hideLabel
      options={SORT_OPTIONS}
      value={state.sort}
      onChange={(e) => update({ sort: e.target.value as PublicSort })}
      className={className}
    />
  );
}
