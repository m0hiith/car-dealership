'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sellRequestUpdateSchema, type SellRequestUpdateInput } from '@/lib/validation/admin-sell';

// /admin/sell-requests. Re-checks admin access (CLAUDE.md §5) and runs as
// the signed-in user, so RLS applies on top. Revalidating the admin layout
// refreshes the list, the tab counts and the sidebar's New badge.

export type SellRequestActionResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<'status' | 'notes', string>> };

/** Saves the status and internal notes together. Follow-ups have their own actions (lib/actions/follow-ups.ts). */
export async function updateSellRequest(raw: SellRequestUpdateInput): Promise<SellRequestActionResult> {
  await requireAdmin();
  const parsed = sellRequestUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<'status' | 'notes', string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'status' || key === 'notes') && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const { id, status, notes } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('sell_requests')
    .update({ status, notes }, { count: 'exact' })
    .eq('id', id);
  if (error) {
    console.error('updateSellRequest failed', { id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save. Please try again.' };
  }
  if (count === 0) return { ok: false, error: 'This request no longer exists. Reload the page.' };

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
