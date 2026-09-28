import 'server-only';
import type { CarStatus } from '@/lib/car-options';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/lead-status';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { leadSearchFilter, LEADS_PAGE_SIZE, type LeadsParams } from '@/lib/validation/admin-leads';

// /admin/leads. Runs as the signed-in user, so RLS limits it to admins.
// Callers must still call requireAdmin() first.

export type LeadNote = { id: string; body: string; authorEmail: string | null; createdAt: string };

export type AdminLead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredTime: string | null;
  message: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
  car: {
    id: string;
    slug: string;
    title: string;
    variant: string | null;
    status: CarStatus;
    coverUrl: string | null;
  } | null;
  /** Oldest first. */
  notes: LeadNote[];
};

export type LeadCounts = Record<LeadStatus | 'all', number>;

export type LeadCarOption = { id: string; title: string; variant: string | null; status: CarStatus; leadCount: number };

export type LeadsPage = {
  leads: AdminLead[];
  counts: LeadCounts;
  /** Leads in the current tab, after search and the car filter. */
  total: number;
  page: number;
  pageCount: number;
  cars: LeadCarOption[];
};

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Filterable<Q> = { or(f: string): Q; eq(c: string, v: string): Q };

export async function getLeads(params: LeadsParams): Promise<LeadsPage> {
  const supabase = await createSupabaseServerClient();
  const search = leadSearchFilter(params.q);

  /** Search and the car filter, but not the status tab. Shared by the counts and the list. */
  function filtered<Q extends Filterable<Q>>(query: Q): Q {
    let q = query;
    if (search) q = q.or(search);
    if (params.car) q = q.eq('car_id', params.car);
    return q;
  }

  const [counts, cars] = await Promise.all([countByStatus(supabase, filtered), getLeadCarOptions(supabase)]);
  const total = params.status ? counts[params.status] : counts.all;
  const pageCount = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const from = (page - 1) * LEADS_PAGE_SIZE;

  let leads: AdminLead[] = [];
  if (total > 0) {
    let query = filtered(
      supabase
        .from('leads')
        .select(
          'id, name, phone, email, preferred_time, message, status, source, created_at, car:cars(id, slug, year, variant, status, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name), car_images(image_url, is_primary)), lead_notes(id, body, author_email, created_at)',
        ),
    )
      .order('is_primary', { referencedTable: 'car.car_images', ascending: false })
      .limit(1, { referencedTable: 'car.car_images' })
      .order('created_at', { referencedTable: 'lead_notes', ascending: true });
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + LEADS_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load leads: ${error.message}`);

    leads = data.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      preferredTime: l.preferred_time,
      message: l.message,
      status: l.status,
      source: l.source,
      createdAt: l.created_at,
      car: l.car
        ? {
            id: l.car.id,
            slug: l.car.slug,
            title: [l.car.year, l.car.brand?.name, l.car.model?.name].filter(Boolean).join(' '),
            variant: l.car.variant,
            status: l.car.status,
            coverUrl: l.car.car_images[0]?.image_url ?? null,
          }
        : null,
      notes: l.lead_notes.map((n) => ({
        id: n.id,
        body: n.body,
        authorEmail: n.author_email,
        createdAt: n.created_at,
      })),
    }));
  }

  return { leads, counts, total, page, pageCount, cars };
}

async function countByStatus(
  supabase: Client,
  filtered: <Q extends Filterable<Q>>(query: Q) => Q,
): Promise<LeadCounts> {
  const results = await Promise.all(
    LEAD_STATUSES.map(async (status) => {
      const { count, error } = await filtered(supabase.from('leads').select('id', { count: 'exact', head: true })).eq(
        'status',
        status,
      );
      if (error) throw new Error(`Could not count leads: ${error.message}`);
      return [status, count ?? 0] as const;
    }),
  );
  const counts = Object.fromEntries(results) as Record<LeadStatus, number>;
  return { ...counts, all: results.reduce((sum, [, n]) => sum + n, 0) };
}

async function getLeadCarOptions(supabase: Client): Promise<LeadCarOption[]> {
  const { data, error } = await supabase.rpc('admin_lead_car_options');
  if (error) throw new Error(`Could not load cars for the filter: ${error.message}`);
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    variant: c.variant,
    status: c.status,
    leadCount: Number(c.lead_count),
  }));
}
