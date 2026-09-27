import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Dealership name for admin chrome (sidebar, login). Uncached and
 * cookie-scoped: admin pages are always dynamic. The tagged, cached public
 * version arrives with the homepage in phase 8.
 */
export const getDealershipName = cache(async (): Promise<string> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('site_settings').select('dealership_name').eq('id', 1).maybeSingle();
  if (error) throw new Error(`Could not load site settings: ${error.message}`);
  return data?.dealership_name ?? '';
});
