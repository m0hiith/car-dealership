import 'server-only';
import { cache } from 'react';
import type { Database } from '@/lib/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Every function here runs as the signed-in user, so RLS limits results to
// admins. Callers must still call requireAdmin() first.

type CarStatus = Database['public']['Enums']['car_status'];

export type DashboardStats = {
  total: number;
  published: number;
  reserved: number;
  sold: number;
  newLeads: number;
};

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function countCars(supabase: Client, status?: CarStatus) {
  let query = supabase.from('cars').select('id', { count: 'exact', head: true });
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw new Error(`Could not count cars: ${error.message}`);
  return count ?? 0;
}

/** Count of leads still in the "new" state; also drives the sidebar badge. */
export const getNewLeadCount = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) throw new Error(`Could not count leads: ${error.message}`);
  return count ?? 0;
});

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const [total, published, reserved, sold, newLeads] = await Promise.all([
    countCars(supabase),
    countCars(supabase, 'published'),
    countCars(supabase, 'reserved'),
    countCars(supabase, 'sold'),
    getNewLeadCount(),
  ]);
  return { total, published, reserved, sold, newLeads };
}

export async function getRecentCars(limit = 5) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cars')
    .select('id, slug, variant, year, price, status, created_at, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load recent cars: ${error.message}`);
  return data;
}

export async function getLatestLeads(limit = 5) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, name, phone, status, created_at, car:cars(year, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name))',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load leads: ${error.message}`);
  return data;
}

export type RecentCar = Awaited<ReturnType<typeof getRecentCars>>[number];
export type LatestLead = Awaited<ReturnType<typeof getLatestLeads>>[number];
