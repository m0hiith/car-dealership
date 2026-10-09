'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { followUpSaveSchema, followUpTargetSchema, type FollowUpSaveInput } from '@/lib/follow-up';
import { formatDate } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Follow-ups on leads and sell requests. Each action re-checks admin access
// (CLAUDE.md §5) and runs as the signed-in user, so RLS applies on top.
// Changing follow_up_at re-arms the reminder email (database trigger).
// Revalidating the admin layout refreshes the dashboard's Follow-ups Today.

export type FollowUpActionResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: { at?: string; note?: string } };

const TABLE = { lead: 'leads', sell: 'sell_requests' } as const;
const GONE = 'This record no longer exists. Reload the page.';

/** Sets or reschedules a follow-up. */
export async function saveFollowUp(raw: FollowUpSaveInput): Promise<FollowUpActionResult> {
  await requireAdmin();
  const parsed = followUpSaveSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: { at?: string; note?: string } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'at' || key === 'note') && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  const { kind, id, at, note } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from(TABLE[kind])
    .update({ follow_up_at: at, follow_up_note: note }, { count: 'exact' })
    .eq('id', id);
  if (error) {
    console.error('saveFollowUp failed', { kind, id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save the follow-up. Please try again.' };
  }
  if (count === 0) return { ok: false, error: GONE };

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/**
 * Marks the follow-up done: clears it and keeps a record. On a lead that is
 * an internal note; on a sell request, a line added to its internal notes.
 */
export async function completeFollowUp(raw: { kind: string; id: string }): Promise<FollowUpActionResult> {
  await requireAdmin();
  const parsed = followUpTargetSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  const { kind, id } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const record = (at: string | null, note: string | null) =>
    `Follow-up done${at ? ` (was due ${formatDate(at)})` : ''}${note ? `: ${note}` : '.'}`;

  if (kind === 'lead') {
    const { data: lead, error: loadError } = await supabase
      .from('leads')
      .select('follow_up_at, follow_up_note')
      .eq('id', id)
      .maybeSingle();
    if (loadError) return { ok: false, error: 'Could not update. Please try again.' };
    if (!lead) return { ok: false, error: GONE };
    if (!lead.follow_up_at) return { ok: true };

    const { error } = await supabase.from('leads').update({ follow_up_at: null, follow_up_note: null }).eq('id', id);
    if (error) return { ok: false, error: 'Could not update. Please try again.' };
    // History only; the follow-up is already cleared if this fails.
    const { error: noteError } = await supabase
      .from('lead_notes')
      .insert({ lead_id: id, body: record(lead.follow_up_at, lead.follow_up_note).slice(0, 2000) });
    if (noteError) console.error('Could not record a done follow-up', { id, message: noteError.message });
  } else {
    const { data: request, error: loadError } = await supabase
      .from('sell_requests')
      .select('follow_up_at, follow_up_note, notes')
      .eq('id', id)
      .maybeSingle();
    if (loadError) return { ok: false, error: 'Could not update. Please try again.' };
    if (!request) return { ok: false, error: GONE };
    if (!request.follow_up_at) return { ok: true };

    const line = `[${formatDate(new Date())}] ${record(request.follow_up_at, request.follow_up_note)}`;
    const notes = [request.notes, line].filter(Boolean).join('\n').slice(-5000);
    const { error } = await supabase
      .from('sell_requests')
      .update({ follow_up_at: null, follow_up_note: null, notes })
      .eq('id', id);
    if (error) return { ok: false, error: 'Could not update. Please try again.' };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
