'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Select } from '@/components/ui';
import { SearchIcon } from '@/components/ui/icons';
import { searchHref } from '@/lib/browse-links';
import type { BrowseOptions } from '@/lib/queries/homepage';

/**
 * Brand and model pickers that open /cars filtered. Also a plain GET form,
 * so it works before the page has hydrated.
 */
export function HeroSearch({ brands }: { brands: BrowseOptions['brands'] }) {
  const router = useRouter();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const selectedBrand = brands.find((b) => b.slug === brand);
  const models = selectedBrand?.models ?? [];

  const total = brands.reduce((sum, b) => sum + b.count, 0);
  const matches = models.find((m) => m.slug === model)?.count ?? selectedBrand?.count ?? total;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(searchHref({ brand, model }));
  }

  return (
    <form
      action="/cars"
      method="get"
      role="search"
      aria-label="Find a car"
      onSubmit={onSubmit}
      className="grid gap-3 rounded-card border border-border bg-card p-4 shadow-overlay md:grid-cols-[1fr_1fr_auto] md:items-end"
    >
      <Select
        label="Brand"
        name="brand"
        value={brand}
        onChange={(e) => {
          setBrand(e.target.value);
          setModel('');
        }}
        placeholder="Any brand"
        options={brands.map((b) => ({ value: b.slug, label: `${b.name} (${b.count})` }))}
      />
      <Select
        label="Model"
        name="model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={!selectedBrand}
        placeholder={selectedBrand ? 'Any model' : 'Choose a brand first'}
        options={models.map((m) => ({ value: m.slug, label: `${m.name} (${m.count})` }))}
      />
      <Button type="submit" size="lg" className="md:h-11">
        <SearchIcon width={18} height={18} />
        {matches > 0 ? `Show ${matches} car${matches === 1 ? '' : 's'}` : 'Search cars'}
      </Button>
    </form>
  );
}
