import 'server-only';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// app/sitemap.ts only. Cached and expired by tag like the other public reads.

export type SitemapCar = { slug: string; updatedAt: string };

/** sitemap.ts caps how many cars it lists; a single dealer's stock never gets close. */
const SITEMAP_CARS_LIMIT = 5000;

/** Slug and last-modified time of every published or reserved car. */
export const getSitemapCars = unstable_cache(
  async (): Promise<SitemapCar[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('cars')
      .select('slug, updated_at')
      .in('status', ['published', 'reserved'])
      .order('updated_at', { ascending: false })
      .limit(SITEMAP_CARS_LIMIT);
    if (error) throw new Error(`Could not load cars for the sitemap: ${error.message}`);
    return data.map((car) => ({ slug: car.slug, updatedAt: car.updated_at }));
  },
  ['sitemap-cars'],
  { tags: [CACHE_TAGS.cars] },
);
