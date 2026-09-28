import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/lead-status';

/**
 * /admin/leads search params and lead actions. Invalid params fall back to
 * their defaults, so a stale or hand-edited URL still shows a list.
 */

export const LEADS_PAGE_SIZE = 20;

const single = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(single, schema.optional().catch(undefined));

export const leadsParamsSchema = z.object({
  status: optional(z.enum(LEAD_STATUSES)),
  q: optional(
    z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || undefined),
  ),
  car: optional(z.uuid()),
  page: z.preprocess(single, z.coerce.number().int().min(1).max(10_000).catch(1)).default(1),
});

export type LeadsParams = z.output<typeof leadsParamsSchema>;

export function parseLeadsParams(raw: Record<string, string | string[] | undefined>): LeadsParams {
  return leadsParamsSchema.parse(raw);
}

export function hasLeadFilters(p: Pick<LeadsParams, 'q' | 'car'>) {
  return Boolean(p.q || p.car);
}

/** URL for the list with some params changed; any change but the page goes back to page 1. */
export function leadsHref(current: LeadsParams, changes: Partial<LeadsParams> = {}): string {
  const next: LeadsParams = { ...current, ...changes };
  if (!('page' in changes)) next.page = 1;

  const params = new URLSearchParams();
  if (next.status) params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.car) params.set('car', next.car);
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/admin/leads?${query}` : '/admin/leads';
}

/**
 * PostgREST filter for the search box: every word of a name, or a run of
 * phone digits (spaces, +91 and a leading 0 are ignored). Only letters,
 * digits and spaces get through, so nothing can break out of the filter
 * string. Returns null when there is nothing to search for.
 */
export function leadSearchFilter(q: string | undefined): string | null {
  if (!q) return null;
  const words = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 5);

  let digits = q.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  const parts: string[] = [];
  if (words.length === 1) parts.push(`name.ilike.*${words[0]}*`);
  if (words.length > 1) parts.push(`and(${words.map((w) => `name.ilike.*${w}*`).join(',')})`);
  if (digits.length >= 3) parts.push(`phone.like.*${digits}*`);
  return parts.length ? parts.join(',') : null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const leadStatusChangeSchema = z.object({ id: z.uuid(), to: z.enum(LEAD_STATUSES) });

export const LEAD_NOTE_MAX = 2000;

export const leadNoteSchema = z.object({
  leadId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, { error: 'Write a note first.' })
    .max(LEAD_NOTE_MAX, { error: `Keep a note under ${LEAD_NOTE_MAX.toLocaleString('en-IN')} characters.` }),
});

export const leadNoteIdSchema = z.uuid();
