import 'server-only';
import { cache } from 'react';
import type { FuelType, Transmission } from '@/lib/car-options';
import { SELL_REQUEST_STATUSES, type SellRequestStatus } from '@/lib/sell-status';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SELL_REQUESTS_PAGE_SIZE, type SellRequestsParams } from '@/lib/validation/admin-sell';

// /admin/sell-requests. Runs as the signed-in user, so RLS limits it to
// admins. Callers must still call requireAdmin() first.

const BUCKET = 'sell-requests';
/** Photo links in the detail page stay valid this long. */
const PHOTO_URL_SECONDS = 60 * 60;

export type SellRequestSummary = {
  id: string;
  title: string;
  variant: string | null;
  name: string;
  phone: string;
  expectedPrice: number | null;
  kmsDriven: number;
  photoCount: number;
  status: SellRequestStatus;
  followUpAt: string | null;
  createdAt: string;
};

export type SellRequestDetail = SellRequestSummary & {
  fuelType: FuelType;
  transmission: Transmission;
  owners: number;
  registrationState: string | null;
  registrationCity: string | null;
  conditionNotes: string | null;
  preferredTime: string | null;
  notes: string | null;
  followUpNote: string | null;
  updatedAt: string;
  /** Signed, short-lived links; null for a photo that could not be signed (e.g. deleted). */
  photos: { path: string; url: string | null }[];
};

export type SellRequestCounts = Record<SellRequestStatus | 'all', number>;

const SUMMARY_COLUMNS =
  'id, brand_name, model_name, variant, year, name, phone, expected_price, kms_driven, photo_paths, status, follow_up_at, created_at';

type SummaryRow = {
  id: string;
  brand_name: string;
  model_name: string;
  variant: string | null;
  year: number;
  name: string;
  phone: string;
  expected_price: number | null;
  kms_driven: number;
  photo_paths: string[];
  status: SellRequestStatus;
  follow_up_at: string | null;
  created_at: string;
};

function toSummary(r: SummaryRow): SellRequestSummary {
  return {
    id: r.id,
    title: `${r.year} ${r.brand_name} ${r.model_name}`,
    variant: r.variant,
    name: r.name,
    phone: r.phone,
    expectedPrice: r.expected_price,
    kmsDriven: r.kms_driven,
    photoCount: r.photo_paths.length,
    status: r.status,
    followUpAt: r.follow_up_at,
    createdAt: r.created_at,
  };
}

/** Requests still marked New; drives the sidebar badge and the dashboard card. */
export const getNewSellRequestCount = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('sell_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) throw new Error(`Could not count sell requests: ${error.message}`);
  return count ?? 0;
});

export async function getSellRequests(params: SellRequestsParams) {
  const supabase = await createSupabaseServerClient();

  const results = await Promise.all(
    SELL_REQUEST_STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from('sell_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      if (error) throw new Error(`Could not count sell requests: ${error.message}`);
      return [status, count ?? 0] as const;
    }),
  );
  const counts = {
    ...(Object.fromEntries(results) as Record<SellRequestStatus, number>),
    all: results.reduce((sum, [, n]) => sum + n, 0),
  } satisfies SellRequestCounts;

  const total = params.status ? counts[params.status] : counts.all;
  const pageCount = Math.max(1, Math.ceil(total / SELL_REQUESTS_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const from = (page - 1) * SELL_REQUESTS_PAGE_SIZE;

  let requests: SellRequestSummary[] = [];
  if (total > 0) {
    let query = supabase.from('sell_requests').select(SUMMARY_COLUMNS);
    if (params.status) query = query.eq('status', params.status);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + SELL_REQUESTS_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load sell requests: ${error.message}`);
    requests = data.map(toSummary);
  }

  return { requests, counts, total, page, pageCount };
}

export async function getSellRequest(id: string): Promise<SellRequestDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('sell_requests')
    .select(
      `${SUMMARY_COLUMNS}, fuel_type, transmission, owners, registration_state, registration_city, condition_notes, preferred_time, notes, follow_up_note, updated_at`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the sell request: ${error.message}`);
  if (!data) return null;

  let photos: SellRequestDetail['photos'] = [];
  if (data.photo_paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(data.photo_paths, PHOTO_URL_SECONDS);
    if (signError) console.error('Could not sign sell request photos', { id, message: signError.message });
    photos = data.photo_paths.map((path) => ({
      path,
      url: signed?.find((s) => s.path === path && !s.error)?.signedUrl ?? null,
    }));
  }

  return {
    ...toSummary(data),
    fuelType: data.fuel_type,
    transmission: data.transmission,
    owners: data.owners,
    registrationState: data.registration_state,
    registrationCity: data.registration_city,
    conditionNotes: data.condition_notes,
    preferredTime: data.preferred_time,
    notes: data.notes,
    followUpNote: data.follow_up_note,
    updatedAt: data.updated_at,
    photos,
  };
}
