import 'server-only';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// Public reads for /sell. Cached for every visitor and expired with the
// brand list (CACHE_TAGS.brands) when staff add a brand or model.

export type SellBrandOption = { id: string; name: string; models: { id: string; name: string }[] };

/** Every active brand with its active models, A–Z, for the brand and model dropdowns. */
export const getSellBrandOptions = unstable_cache(
  async (): Promise<SellBrandOption[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('brands')
      .select('id, name, models(id, name, is_active)')
      .eq('is_active', true)
      .order('name')
      .limit(500);
    if (error) throw new Error(`Could not load brands: ${error.message}`);
    return data.map((brand) => ({
      id: brand.id,
      name: brand.name,
      models: brand.models
        .filter((m) => m.is_active)
        .map((m) => ({ id: m.id, name: m.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },
  ['sell-brand-options'],
  { tags: [CACHE_TAGS.brands] },
);
