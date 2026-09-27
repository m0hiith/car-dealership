import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Dealership name for admin chrome (sidebar, login). Uncached and
 * cookie-scoped: admin pages are always dynamic. The tagged, cached public
 * version is getSiteSettings() below.
 */
export const getDealershipName = cache(async (): Promise<string> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('site_settings').select('dealership_name').eq('id', 1).maybeSingle();
  if (error) throw new Error(`Could not load site settings: ${error.message}`);
  return data?.dealership_name ?? '';
});

export type SiteSettings = {
  dealershipName: string;
  logoUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  businessHours: string | null;
};

/** Public site settings for the showroom header, footer and contact CTAs. Cached; expired by the settings tag. */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('dealership_name, logo_url, phone, whatsapp_number, address, business_hours')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(`Could not load site settings: ${error.message}`);
    return {
      dealershipName: data?.dealership_name ?? '',
      logoUrl: data?.logo_url ?? null,
      phone: data?.phone ?? null,
      whatsappNumber: data?.whatsapp_number ?? null,
      address: data?.address ?? null,
      businessHours: data?.business_hours ?? null,
    };
  },
  ['site-settings'],
  { tags: [CACHE_TAGS.settings] },
);
