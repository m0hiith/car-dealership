import { z } from 'zod';
import { SELL_REQUEST_STATUSES, type SellRequestStatus } from '@/lib/sell-status';

/**
 * /admin/sell-requests search params and staff updates. Bad params fall back
 * to their defaults, so a stale or hand-edited URL still shows a list.
 */

export const SELL_REQUESTS_PAGE_SIZE = 20;

const single = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const sellRequestsParamsSchema = z.object({
  status: z.preprocess(single, z.enum(SELL_REQUEST_STATUSES).optional().catch(undefined)),
  page: z.preprocess(single, z.coerce.number().int().min(1).max(10_000).catch(1)).default(1),
});

export type SellRequestsParams = z.infer<typeof sellRequestsParamsSchema>;

export function parseSellRequestsParams(raw: Record<string, string | string[] | undefined>): SellRequestsParams {
  return sellRequestsParamsSchema.parse(raw);
}

export function sellRequestsHref(
  params: SellRequestsParams,
  change: { status?: SellRequestStatus | undefined; page?: number },
): string {
  const next = { ...params, page: 1, ...change };
  const search = new URLSearchParams();
  if (next.status) search.set('status', next.status);
  if (next.page > 1) search.set('page', String(next.page));
  const query = search.toString();
  return `/admin/sell-requests${query ? `?${query}` : ''}`;
}

export const sellRequestUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(SELL_REQUEST_STATUSES),
  notes: z
    .string()
    .trim()
    .max(5000, { error: 'Keep the notes under 5,000 characters.' })
    .transform((v) => v || null),
});

export type SellRequestUpdateInput = z.input<typeof sellRequestUpdateSchema>;
