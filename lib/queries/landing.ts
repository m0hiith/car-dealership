import 'server-only';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import type { BodyType } from '@/lib/car-options';
import { getBrowseOptions } from '@/lib/queries/homepage';
import { CARD_SELECT, toPublicCarCard, type PublicCarCard } from '@/lib/queries/public-cars';
import { PRICE_CEILINGS_LAKH, type Landing, type LandingStats } from '@/lib/seo';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// Generated landing pages (/used-cars-hyderabad, /used-cars/[segment]).
// Filtering happens in Postgres; a page only exists while it has stock.
// Cached and expired with the cars tag like every public car list.

/** Cars shown on a landing page; the rest are one click away on /cars. */
export const LANDING_CARS_LIMIT = 48;
const LAKH = 100_000;
const PUBLIC_STATUSES = ['published', 'reserved'] as const;

export type LandingPage = {
  cars: PublicCarCard[];
  stats: LandingStats;
  /** The brand's display name, for brand pages. */
  brandName?: string;
};

/** Most common first, ties alphabetical. */
function byFrequency(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
}

/** A landing page's cars and the facts its intro is written from, or null when nothing matches. */
export const getLandingPage = unstable_cache(
  async (landing: Landing): Promise<LandingPage | null> => {
    const supabase = createSupabasePublicClient();

    let brandName: string | undefined;
    // !inner so the brand filter applies to the cars, not just the embedded row.
    const select =
      landing.kind === 'brand'
        ? CARD_SELECT.replace('brand:brands(name)', 'brand:brands!inner(name, slug)')
        : CARD_SELECT;

    let query = supabase
      .from('cars')
      .select(select, { count: 'exact' })
      .in('status', PUBLIC_STATUSES)
      .order('is_primary', { referencedTable: 'car_images', ascending: false })
      .limit(1, { referencedTable: 'car_images' });
    if (landing.kind === 'brand') query = query.eq('brand.slug', landing.slug);
    if (landing.kind === 'body') query = query.eq('body_type', landing.bodyType);
    if (landing.kind === 'budget') query = query.lte('price', landing.lakh * LAKH);

    const { data, count, error } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id')
      .limit(LANDING_CARS_LIMIT);
    if (error) throw new Error(`Could not load landing page cars: ${error.message}`);
    if (!data.length || !count) return null;

    // supabase-js cannot infer a select string built at runtime.
    const rows = data as unknown as Parameters<typeof toPublicCarCard>[0][];
    const cars = rows.map(toPublicCarCard);
    if (landing.kind === 'brand') brandName = cars[0]?.brand ?? undefined;

    // Price range over every match, not just the cars shown.
    const priceQuery = (ascending: boolean) => {
      let q = supabase
        .from('cars')
        .select(landing.kind === 'brand' ? 'price, brand:brands!inner(slug)' : 'price')
        .in('status', PUBLIC_STATUSES);
      if (landing.kind === 'brand') q = q.eq('brand.slug', landing.slug);
      if (landing.kind === 'body') q = q.eq('body_type', landing.bodyType);
      if (landing.kind === 'budget') q = q.lte('price', landing.lakh * LAKH);
      return q.order('price', { ascending }).limit(1).maybeSingle();
    };
    const [min, max] = await Promise.all([priceQuery(true), priceQuery(false)]);
    if (min.error || max.error) throw new Error('Could not load landing page prices.');
    const priceOf = (row: unknown) => (row as { price: number } | null)?.price;

    const stats: LandingStats = {
      total: count,
      minPrice: priceOf(min.data) ?? Math.min(...cars.map((c) => c.price)),
      maxPrice: priceOf(max.data) ?? Math.max(...cars.map((c) => c.price)),
      brands: byFrequency(cars.flatMap((c) => (c.brand ? [c.brand] : []))),
      models: byFrequency(cars.flatMap((c) => (c.model ? [c.model] : []))),
      bodyTypes: byFrequency(cars.map((c) => c.bodyType)) as BodyType[],
    };
    return { cars, stats, brandName };
  },
  ['landing-page'],
  { tags: [CACHE_TAGS.cars] },
);

/** Every landing page that currently has stock, with its car count (for the sitemap and links). */
export const getLandingPages = unstable_cache(
  async (): Promise<{ landing: Landing; count: number }[]> => {
    const supabase = createSupabasePublicClient();
    const [browse, ...budgetCounts] = await Promise.all([
      getBrowseOptions(),
      ...PRICE_CEILINGS_LAKH.map(async (lakh) => {
        const { count, error } = await supabase
          .from('cars')
          .select('id', { count: 'exact', head: true })
          .in('status', PUBLIC_STATUSES)
          .lte('price', lakh * LAKH);
        if (error) throw new Error(`Could not count cars under ${lakh} lakh: ${error.message}`);
        return { lakh, count: count ?? 0 };
      }),
    ]);

    const total = browse.brands.reduce((sum, b) => sum + b.count, 0);
    const pages: { landing: Landing; count: number }[] = [];
    if (total > 0) pages.push({ landing: { kind: 'all' }, count: total });
    for (const brand of browse.brands) {
      if (brand.count > 0) pages.push({ landing: { kind: 'brand', slug: brand.slug }, count: brand.count });
    }
    for (const [bodyType, count] of Object.entries(browse.bodyTypeCounts) as [BodyType, number][]) {
      if (count > 0) pages.push({ landing: { kind: 'body', bodyType }, count });
    }
    for (const { lakh, count } of budgetCounts) {
      if (count > 0) pages.push({ landing: { kind: 'budget', lakh }, count });
    }
    return pages;
  },
  ['landing-pages'],
  { tags: [CACHE_TAGS.cars, CACHE_TAGS.brands] },
);
