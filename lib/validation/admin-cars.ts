import { z } from 'zod';
import { CAR_STATUSES, FUEL_TYPES, TRANSMISSIONS, type CarStatus } from '@/lib/car-options';

/**
 * /admin/cars search params. Anything invalid falls back to its default
 * instead of erroring, so a stale or hand-edited URL still shows a list.
 */

export const INVENTORY_PAGE_SIZE = 20;

export const INVENTORY_SORTS = {
  updated: 'Recently updated',
  created: 'Recently added',
  price_desc: 'Price: high to low',
  price_asc: 'Price: low to high',
  year_desc: 'Year: newest first',
} as const;

export type InventorySort = keyof typeof INVENTORY_SORTS;

const SORT_KEYS = Object.keys(INVENTORY_SORTS) as [InventorySort, ...InventorySort[]];

/** First value when a param is repeated (?q=a&q=b). */
const single = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(single, schema.optional().catch(undefined));

export const inventoryParamsSchema = z.object({
  status: optional(z.enum(CAR_STATUSES)),
  q: optional(
    z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || undefined),
  ),
  brand: optional(z.uuid()),
  fuel: optional(z.enum(FUEL_TYPES)),
  transmission: optional(z.enum(TRANSMISSIONS)),
  sort: z.preprocess(single, z.enum(SORT_KEYS).catch('updated')).default('updated'),
  page: z.preprocess(single, z.coerce.number().int().min(1).max(10_000).catch(1)).default(1),
});

export type InventoryParams = z.output<typeof inventoryParamsSchema>;

export function parseInventoryParams(raw: Record<string, string | string[] | undefined>): InventoryParams {
  return inventoryParamsSchema.parse(raw);
}

/** True when search or a filter (not the status tab or sort) narrows the list. */
export function hasInventoryFilters(p: Pick<InventoryParams, 'q' | 'brand' | 'fuel' | 'transmission'>) {
  return Boolean(p.q || p.brand || p.fuel || p.transmission);
}

/**
 * URL for the inventory with some params changed. Defaults are left out so
 * URLs stay short, and any change other than the page goes back to page 1.
 */
export function inventoryHref(current: InventoryParams, changes: Partial<InventoryParams> = {}): string {
  const next: InventoryParams = { ...current, ...changes };
  if (!('page' in changes)) next.page = 1;

  const params = new URLSearchParams();
  if (next.status) params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.brand) params.set('brand', next.brand);
  if (next.fuel) params.set('fuel', next.fuel);
  if (next.transmission) params.set('transmission', next.transmission);
  if (next.sort !== 'updated') params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return query ? `/admin/cars?${query}` : '/admin/cars';
}

/**
 * Search words, lowercased, with anything but letters, digits, dots and
 * hyphens stripped. The words go into a PostgREST filter string, so this
 * also keeps out the characters that have meaning there (, ( ) * " \).
 */
export function inventorySearchTokens(q: string | undefined): string[] {
  if (!q) return [];
  const words = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ''))
    .filter(Boolean);
  return [...new Set(words)].slice(0, 6);
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export const carStatusChangeSchema = z.object({
  id: z.uuid(),
  to: z.enum(CAR_STATUSES),
});

export type CarStatusChange = { id: string; to: CarStatus };
