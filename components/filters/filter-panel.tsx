'use client';

import { useId, useState, type ReactNode } from 'react';
import { Checkbox, Chip, Input } from '@/components/ui';
import { RangeSlider, type RangeValue } from '@/components/ui/range-slider';
import { cn } from '@/lib/cn';
import { BODY_TYPE_LABELS, BODY_TYPES, FUEL_LABELS, FUEL_TYPES } from '@/lib/car-options';
import { formatKm } from '@/lib/format';
import {
  formatLakh,
  KM_OPTIONS,
  OWNER_FILTER_LABELS,
  OWNER_FILTERS,
  toggle,
  TRANSMISSION_GROUP_LABELS,
  TRANSMISSION_GROUPS,
  withoutBrand,
  yearOptions,
} from '@/lib/validation/public-cars';
import { useListing } from './listing-context';

export const FILTER_SECTIONS = {
  price: 'Price',
  brand: 'Brand',
  model: 'Model',
  year: 'Year',
  km: 'KM driven',
  fuel: 'Fuel',
  transmission: 'Transmission',
  body: 'Body type',
  owners: 'Owners',
  colour: 'Colour',
} as const;
export type FilterSectionKey = keyof typeof FILTER_SECTIONS;

/** Element id of a section, so the tablet chip bar can scroll the sheet to it. */
export const filterSectionId = (prefix: string, key: FilterSectionKey) => `${prefix}-filter-${key}`;

const YEARS = yearOptions();
const COLLAPSED_COUNT = 8;

/** Every filter. Changes apply straight away. */
export function FilterPanel({ idPrefix, className }: { idPrefix: string; className?: string }) {
  const { state, fixed, effective, facets, update } = useListing();
  const f = state.filters;
  const section = (key: FilterSectionKey) => ({ id: filterSectionId(idPrefix, key), title: FILTER_SECTIONS[key] });

  const modelsByBrand = new Map<string, typeof facets.models>();
  for (const m of facets.models) modelsByBrand.set(m.brandName, [...(modelsByBrand.get(m.brandName) ?? []), m]);

  return (
    <div className={cn('flex flex-col divide-y divide-border', className)}>
      {facets.priceMin !== null && facets.priceMax !== null && (
        <FilterSection {...section('price')}>
          <PriceFilter min={facets.priceMin} max={facets.priceMax} />
        </FilterSection>
      )}

      {!fixed.brands && facets.brands.length > 0 && (
        <FilterSection {...section('brand')}>
          <CollapsibleList
            items={facets.brands}
            noun="brands"
            render={(b) => (
              <Checkbox
                key={b.slug}
                label={b.name}
                meta={b.count}
                checked={f.brands.includes(b.slug)}
                onChange={() =>
                  update({
                    filters: f.brands.includes(b.slug)
                      ? withoutBrand(f, b.slug, facets.models)
                      : { brands: [...f.brands, b.slug] },
                  })
                }
              />
            )}
          />
        </FilterSection>
      )}

      {effective.brands.length > 0 && (
        <FilterSection {...section('model')}>
          {facets.models.length === 0 ? (
            <p className="text-body-md text-muted">No models match the other filters.</p>
          ) : (
            [...modelsByBrand].map(([brandName, models]) => (
              <div key={brandName} className="flex flex-col">
                {modelsByBrand.size > 1 && <p className="pt-2 text-label-md text-muted">{brandName}</p>}
                {models.map((m) => (
                  <Checkbox
                    key={`${m.brandSlug}/${m.slug}`}
                    label={m.name}
                    meta={m.count}
                    checked={f.models.includes(m.slug)}
                    onChange={() => update({ filters: { models: toggle(f.models, m.slug) } })}
                  />
                ))}
              </div>
            ))
          )}
        </FilterSection>
      )}

      <FilterSection {...section('year')}>
        <ChipGroup>
          {YEARS.map((year) => (
            <Chip
              key={year}
              selected={f.minYear === year}
              onClick={() => update({ filters: { minYear: f.minYear === year ? null : year } })}
            >
              {year} & newer
            </Chip>
          ))}
        </ChipGroup>
      </FilterSection>

      <FilterSection {...section('km')}>
        <ChipGroup>
          {KM_OPTIONS.map((km) => (
            <Chip
              key={km}
              selected={f.maxKm === km}
              onClick={() => update({ filters: { maxKm: f.maxKm === km ? null : km } })}
            >
              Under {formatKm(km)}
            </Chip>
          ))}
        </ChipGroup>
      </FilterSection>

      <FilterSection {...section('fuel')}>
        <ChipGroup>
          {FUEL_TYPES.map((fuel) => (
            <Chip
              key={fuel}
              selected={f.fuels.includes(fuel)}
              onClick={() => update({ filters: { fuels: toggle(f.fuels, fuel) } })}
            >
              {FUEL_LABELS[fuel]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterSection>

      <FilterSection {...section('transmission')}>
        <ChipGroup>
          {TRANSMISSION_GROUPS.map((t) => (
            <Chip
              key={t}
              selected={f.transmissions.includes(t)}
              onClick={() => update({ filters: { transmissions: toggle(f.transmissions, t) } })}
            >
              {TRANSMISSION_GROUP_LABELS[t]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterSection>

      {!fixed.bodyTypes && (
        <FilterSection {...section('body')}>
          <ChipGroup>
            {BODY_TYPES.map((body) => (
              <Chip
                key={body}
                selected={f.bodyTypes.includes(body)}
                onClick={() => update({ filters: { bodyTypes: toggle(f.bodyTypes, body) } })}
              >
                {BODY_TYPE_LABELS[body]}
              </Chip>
            ))}
          </ChipGroup>
        </FilterSection>
      )}

      <FilterSection {...section('owners')}>
        <ChipGroup>
          {OWNER_FILTERS.map((o) => (
            <Chip
              key={o}
              selected={f.owners.includes(o)}
              onClick={() => update({ filters: { owners: toggle(f.owners, o) } })}
            >
              {OWNER_FILTER_LABELS[o]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterSection>

      {facets.colours.length > 0 && (
        <FilterSection {...section('colour')}>
          <CollapsibleList
            items={facets.colours}
            noun="colours"
            render={(c) => (
              <Checkbox
                key={c.value}
                label={c.name}
                meta={c.count}
                checked={f.colours.includes(c.value)}
                onChange={() => update({ filters: { colours: toggle(f.colours, c.value) } })}
              />
            )}
          />
        </FilterSection>
      )}
    </div>
  );
}

function FilterSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-4 flex-col gap-2 py-5 first:pt-0 last:pb-0"
    >
      <h3 id={`${id}-title`} className="text-label-lg text-navy">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function CollapsibleList<T>({ items, noun, render }: { items: T[]; noun: string; render: (item: T) => ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  return (
    <div className="flex flex-col">
      <div id={listId} className="flex flex-col">
        {visible.map(render)}
      </div>
      {items.length > COLLAPSED_COUNT && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 self-start rounded-control text-label-lg text-action focus-ring hover:underline"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length} ${noun}`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price: dual slider + min/max inputs, in lakh
// ---------------------------------------------------------------------------

function priceStep(spanLakh: number) {
  if (spanLakh <= 20) return 0.5;
  if (spanLakh <= 100) return 1;
  return 5;
}

function PriceFilter({ min, max }: { min: number; max: number }) {
  const { state, update } = useListing();
  const { minPrice, maxPrice } = state.filters;

  // Slider bounds: the cheapest and dearest car in stock, rounded out to whole lakh.
  const lo = Math.floor(min / 100_000);
  const hi = Math.max(Math.ceil(max / 100_000), lo + 1);
  const step = priceStep(hi - lo);
  const clamp = (n: number) => Math.min(Math.max(n, lo), hi);

  const applied: RangeValue = [clamp(minPrice ?? lo), clamp(maxPrice ?? hi)];
  const [draft, setDraft] = useState<RangeValue>(applied);
  const [inputs, setInputs] = useState<[string, string]>([String(applied[0]), String(applied[1])]);

  // Follow the URL when it changes elsewhere (chip removed, Clear all, Back).
  const appliedKey = `${minPrice}-${maxPrice}-${lo}-${hi}`;
  const [seenKey, setSeenKey] = useState(appliedKey);
  if (appliedKey !== seenKey) {
    setSeenKey(appliedKey);
    setDraft(applied);
    setInputs([String(applied[0]), String(applied[1])]);
  }

  function commit([a, b]: RangeValue) {
    const nextMin = a <= lo ? null : a;
    const nextMax = b >= hi ? null : b;
    if (nextMin === minPrice && nextMax === maxPrice) return;
    update({ filters: { minPrice: nextMin, maxPrice: nextMax } });
  }

  function commitInputs() {
    const parse = (text: string, fallback: number) => {
      const n = Number(text.replace(/[^\d.]/g, ''));
      return text.trim() === '' || !Number.isFinite(n) ? fallback : clamp(Math.round(n * 100) / 100);
    };
    let a = parse(inputs[0], lo);
    let b = parse(inputs[1], hi);
    if (a > b) [a, b] = [b, a];
    setDraft([a, b]);
    setInputs([String(a), String(b)]);
    commit([a, b]);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md font-semibold text-chip-ink tabular-nums" aria-live="polite">
        {formatLakh(draft[0])} – {formatLakh(draft[1])}
        {draft[1] >= hi && '+'}
      </p>
      <div className="px-3">
        <RangeSlider
          min={lo}
          max={hi}
          step={step}
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setInputs([String(v[0]), String(v[1])]);
          }}
          onCommit={commit}
          labels={['Minimum price', 'Maximum price']}
          formatValue={formatLakh}
        />
      </div>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          commitInputs();
        }}
      >
        <Input
          label="Min (lakh)"
          inputMode="decimal"
          autoComplete="off"
          value={inputs[0]}
          onChange={(e) => setInputs([e.target.value, inputs[1]])}
          onBlur={commitInputs}
        />
        <Input
          label="Max (lakh)"
          inputMode="decimal"
          autoComplete="off"
          value={inputs[1]}
          onChange={(e) => setInputs([inputs[0], e.target.value])}
          onBlur={commitInputs}
        />
        {/* Enter in either field applies. */}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Apply price
        </button>
      </form>
    </div>
  );
}
