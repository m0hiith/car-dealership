import type { BodyType } from '@/lib/car-options';

/**
 * Shortcuts into the /cars listing from the homepage (PRODUCT_SPEC §5.2).
 * Budgets are in lakh, matching the min_price / max_price URL params.
 */

export const BUDGET_BANDS = [
  { label: 'Under ₹5L', min: null, max: 5 },
  { label: '₹5–10L', min: 5, max: 10 },
  { label: '₹10–20L', min: 10, max: 20 },
  { label: '₹20L+', min: 20, max: null },
] as const satisfies readonly { label: string; min: number | null; max: number | null }[];

export function budgetHref({ min, max }: { min: number | null; max: number | null }): string {
  const params = new URLSearchParams();
  if (min !== null) params.set('min_price', String(min));
  if (max !== null) params.set('max_price', String(max));
  return `/cars?${params.toString()}`;
}

/** Body-type tiles, in display order. */
export const HOME_BODY_TYPES = ['suv', 'sedan', 'hatchback', 'muv', 'luxury'] as const satisfies readonly BodyType[];

export function searchHref({ brand, model }: { brand?: string | null; model?: string | null }): string {
  const parts: string[] = [];
  if (brand) parts.push(`brand=${encodeURIComponent(brand)}`);
  if (model) parts.push(`model=${encodeURIComponent(model)}`);
  return parts.length ? `/cars?${parts.join('&')}` : '/cars';
}
