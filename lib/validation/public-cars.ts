import { z } from 'zod';
import { BODY_TYPE_LABELS, BODY_TYPES, FUEL_LABELS, FUEL_TYPES, type BodyType, type FuelType } from '@/lib/car-options';
import { formatKm, formatPriceLakh } from '@/lib/format';
import { SLUG_PATTERN } from '@/lib/slug';

/**
 * Public /cars listing state. Everything lives in the URL so a filtered list
 * can be shared and survives the back button. Lists are comma-separated
 * (?fuel=petrol,diesel). Invalid values are dropped rather than erroring.
 */

export const PUBLIC_CARS_PAGE_SIZE = 20;
/** "Load more" stops here (500 cars); filters are the better tool beyond that. */
export const PUBLIC_CARS_MAX_PAGE = 25;

export const PUBLIC_SORTS = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  km_asc: 'KM: low to high',
  year_desc: 'Year: newest first',
} as const;
export type PublicSort = keyof typeof PUBLIC_SORTS;
const SORT_KEYS = Object.keys(PUBLIC_SORTS) as [PublicSort, ...PublicSort[]];

/** AMT, CVT, DCT and torque converter are all "Automatic" publicly. */
export const TRANSMISSION_GROUPS = ['manual', 'automatic'] as const;
export type TransmissionGroup = (typeof TRANSMISSION_GROUPS)[number];
export const TRANSMISSION_GROUP_LABELS: Record<TransmissionGroup, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
};

/** 3 means "3 or more". */
export const OWNER_FILTERS = [1, 2, 3] as const;
export type OwnerFilter = (typeof OWNER_FILTERS)[number];
export const OWNER_FILTER_LABELS: Record<OwnerFilter, string> = {
  1: '1st owner',
  2: '2nd owner',
  3: '3rd owner or more',
};

export const KM_OPTIONS = [10_000, 30_000, 50_000, 75_000, 100_000] as const;

/** Minimum-year choices: every other year going back 10 years (2024+, 2022+, ...). */
export function yearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  return [2, 4, 6, 8, 10].map((n) => y - n);
}

export type CarFilters = {
  brands: string[];
  models: string[];
  /** In lakh, as shown in the UI and the URL. */
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxKm: number | null;
  fuels: FuelType[];
  transmissions: TransmissionGroup[];
  bodyTypes: BodyType[];
  owners: OwnerFilter[];
  /** Lowercase colour names. */
  colours: string[];
};

export type ListingState = { filters: CarFilters; sort: PublicSort; page: number };

export const EMPTY_FILTERS: CarFilters = {
  brands: [],
  models: [],
  minPrice: null,
  maxPrice: null,
  minYear: null,
  maxKm: null,
  fuels: [],
  transmissions: [],
  bodyTypes: [],
  owners: [],
  colours: [],
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

type RawParams = Record<string, string | string[] | undefined>;

const MAX_LIST = 20;

function rawList(raw: RawParams, key: string): string[] {
  const value = raw[key];
  const parts = (Array.isArray(value) ? value : value ? [value] : []).flatMap((v) => v.split(','));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function list<T>(raw: RawParams, key: string, item: z.ZodType<T>): T[] {
  const out: T[] = [];
  for (const part of rawList(raw, key)) {
    const parsed = item.safeParse(part);
    if (parsed.success && !out.includes(parsed.data)) out.push(parsed.data);
    if (out.length === MAX_LIST) break;
  }
  return out;
}

function single<T>(raw: RawParams, key: string, schema: z.ZodType<T>): T | null {
  const value = raw[key];
  const parsed = schema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : null;
}

const slug = z.string().max(80).regex(SLUG_PATTERN);
const lakh = z.coerce
  .number()
  .finite()
  .min(0)
  .max(100_000)
  .transform((n) => Math.round(n * 100) / 100);
const colour = z
  .string()
  .max(40)
  .regex(/^[\p{L} ]+$/u)
  .transform((c) => c.toLowerCase().replace(/\s+/g, ' ').trim());

export function parseListingState(raw: RawParams): ListingState {
  let minPrice = single(raw, 'min_price', lakh);
  let maxPrice = single(raw, 'max_price', lakh);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];

  return {
    filters: {
      brands: list(raw, 'brand', slug),
      models: list(raw, 'model', slug),
      minPrice: minPrice || null,
      maxPrice,
      minYear: single(raw, 'year', z.coerce.number().int().min(1980).max(2100)),
      maxKm: single(
        raw,
        'km',
        z.coerce
          .number()
          .int()
          .refine((n) => (KM_OPTIONS as readonly number[]).includes(n)),
      ),
      fuels: list(raw, 'fuel', z.enum(FUEL_TYPES)),
      transmissions: list(raw, 'transmission', z.enum(TRANSMISSION_GROUPS)),
      bodyTypes: list(raw, 'body', z.enum(BODY_TYPES)),
      owners: list(raw, 'owners', z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(3)]))),
      colours: list(raw, 'colour', colour),
    },
    sort: single(raw, 'sort', z.enum(SORT_KEYS)) ?? 'newest',
    page: single(raw, 'page', z.coerce.number().int().min(1).max(PUBLIC_CARS_MAX_PAGE)) ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export type ListingChanges = { filters?: Partial<CarFilters>; sort?: PublicSort; page?: number };

/**
 * URL for the listing with some state changed. Any change except the page
 * goes back to page 1. Commas are left unencoded so lists stay readable.
 */
export function listingHref(basePath: string, state: ListingState, changes: ListingChanges = {}): string {
  const filters = { ...state.filters, ...changes.filters };
  const sort = changes.sort ?? state.sort;
  const page = changes.page ?? 1;

  const parts: string[] = [];
  const add = (key: string, value: string | number | null) => {
    if (value !== null && value !== '') parts.push(`${key}=${encodeURIComponent(String(value))}`);
  };
  const addList = (key: string, values: readonly (string | number)[]) => {
    if (values.length) parts.push(`${key}=${values.map((v) => encodeURIComponent(String(v))).join(',')}`);
  };

  addList('brand', filters.brands);
  addList('model', filters.models);
  add('min_price', filters.minPrice);
  add('max_price', filters.maxPrice);
  add('year', filters.minYear);
  add('km', filters.maxKm);
  addList('fuel', filters.fuels);
  addList('transmission', filters.transmissions);
  addList('body', filters.bodyTypes);
  addList('owners', filters.owners);
  addList('colour', filters.colours);
  if (sort !== 'newest') add('sort', sort);
  if (page > 1) add('page', page);

  return parts.length ? `${basePath}?${parts.join('&')}` : basePath;
}

export function countActiveFilters(filters: CarFilters): number {
  return (
    filters.brands.length +
    filters.models.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.minYear !== null ? 1 : 0) +
    (filters.maxKm !== null ? 1 : 0) +
    filters.fuels.length +
    filters.transmissions.length +
    filters.bodyTypes.length +
    filters.owners.length +
    filters.colours.length
  );
}

/** Adds or removes one value from a list filter. */
export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Filters a page shows but the URL does not own: the brand on /cars/brand/bmw, the type on /cars/type/suv. */
export type FixedFilters = Partial<Pick<CarFilters, 'brands' | 'bodyTypes'>>;

export function withFixed(filters: CarFilters, fixed: FixedFilters): CarFilters {
  return { ...filters, ...fixed };
}

/**
 * Removes a brand and any selected models that belong to it. A model left
 * behind without its brand would match nothing, since models are only
 * searched within the selected brands.
 */
export function withoutBrand(
  filters: CarFilters,
  brandSlug: string,
  models: readonly { slug: string; brandSlug: string }[],
): Partial<CarFilters> {
  const brands = filters.brands.filter((b) => b !== brandSlug);
  const kept = filters.models.filter((m) =>
    models.some((fm) => fm.slug === m && fm.brandSlug !== brandSlug && brands.includes(fm.brandSlug)),
  );
  return { brands, models: brands.length ? kept : [] };
}

/** "₹5 Lakh" from a lakh amount. */
export function formatLakh(lakh: number): string {
  return formatPriceLakh(Math.round(lakh * 100_000));
}

export function priceLabel(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${formatLakh(min)} – ${formatLakh(max)}`;
  if (max !== null) return `Under ${formatLakh(max)}`;
  if (min !== null) return `Over ${formatLakh(min)}`;
  return null;
}

export type ActiveFilter = { key: string; label: string; remove: Partial<CarFilters> };

export type FilterNames = {
  brands: readonly { slug: string; name: string }[];
  models: readonly { slug: string; name: string; brandSlug: string }[];
  colours: readonly { value: string; name: string }[];
};

/** Removable chips for every active filter, in panel order. */
export function activeFilters(filters: CarFilters, names: FilterNames): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const titleCase = (s: string) => s.replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()).replace(/-/g, ' ');

  const price = priceLabel(filters.minPrice, filters.maxPrice);
  if (price) out.push({ key: 'price', label: price, remove: { minPrice: null, maxPrice: null } });
  for (const slug of filters.brands) {
    out.push({
      key: `brand:${slug}`,
      label: names.brands.find((b) => b.slug === slug)?.name ?? titleCase(slug),
      remove: withoutBrand(filters, slug, names.models),
    });
  }
  for (const slug of filters.models) {
    out.push({
      key: `model:${slug}`,
      label: names.models.find((m) => m.slug === slug)?.name ?? titleCase(slug),
      remove: { models: filters.models.filter((m) => m !== slug) },
    });
  }
  if (filters.minYear !== null) {
    out.push({ key: 'year', label: `${filters.minYear} & newer`, remove: { minYear: null } });
  }
  if (filters.maxKm !== null)
    out.push({ key: 'km', label: `Under ${formatKm(filters.maxKm)}`, remove: { maxKm: null } });
  for (const fuel of filters.fuels) {
    out.push({
      key: `fuel:${fuel}`,
      label: FUEL_LABELS[fuel],
      remove: { fuels: filters.fuels.filter((f) => f !== fuel) },
    });
  }
  for (const t of filters.transmissions) {
    out.push({
      key: `transmission:${t}`,
      label: TRANSMISSION_GROUP_LABELS[t],
      remove: { transmissions: filters.transmissions.filter((x) => x !== t) },
    });
  }
  for (const body of filters.bodyTypes) {
    out.push({
      key: `body:${body}`,
      label: BODY_TYPE_LABELS[body],
      remove: { bodyTypes: filters.bodyTypes.filter((b) => b !== body) },
    });
  }
  for (const o of filters.owners) {
    out.push({
      key: `owners:${o}`,
      label: OWNER_FILTER_LABELS[o],
      remove: { owners: filters.owners.filter((x) => x !== o) },
    });
  }
  for (const c of filters.colours) {
    out.push({
      key: `colour:${c}`,
      label: names.colours.find((x) => x.value === c)?.name ?? titleCase(c),
      remove: { colours: filters.colours.filter((x) => x !== c) },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Database filter (filter_public_cars / public_car_facets)
// ---------------------------------------------------------------------------

export type RpcFilters = {
  brands?: string[];
  models?: string[];
  price_min?: number;
  price_max?: number;
  year_min?: number;
  km_max?: number;
  fuels?: string[];
  transmissions?: string[];
  body_types?: string[];
  owners?: string[];
  colours?: string[];
};

const LAKH = 100_000;

export function toRpcFilters(filters: CarFilters): RpcFilters {
  const out: RpcFilters = {};
  if (filters.brands.length) out.brands = filters.brands;
  if (filters.models.length) out.models = filters.models;
  if (filters.minPrice !== null) out.price_min = Math.round(filters.minPrice * LAKH);
  if (filters.maxPrice !== null) out.price_max = Math.round(filters.maxPrice * LAKH);
  if (filters.minYear !== null) out.year_min = filters.minYear;
  if (filters.maxKm !== null) out.km_max = filters.maxKm;
  if (filters.fuels.length) out.fuels = filters.fuels;
  if (filters.transmissions.length) out.transmissions = filters.transmissions;
  if (filters.bodyTypes.length) out.body_types = filters.bodyTypes;
  if (filters.owners.length) out.owners = filters.owners.map(String);
  if (filters.colours.length) out.colours = filters.colours;
  return out;
}
