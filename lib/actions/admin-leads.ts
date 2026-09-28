'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import type { LeadStatus } from '@/lib/lead-status';
import type { LeadNote } from '@/lib/queries/admin-leads';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { leadNoteIdSchema, leadNoteSchema, leadStatusChangeSchema } from '@/lib/validation/admin-leads';

// /admin/leads actions. Each re-checks admin access (CLAUDE.md §5) and runs
// as the signed-in user, so RLS applies on top. Revalidating the admin
// layout refreshes the list, the tab counts and the sidebar's new-lead badge.

export type LeadActionResult = { ok: true } | { ok: false; error: string };

export async function setLeadStatus(raw: { id: string; to: LeadStatus }): Promise<LeadActionResult> {
  await requireAdmin();
  const parsed = leadStatusChangeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('leads')
    .update({ status: parsed.data.to }, { count: 'exact' })
    .eq('id', parsed.data.id);
  if (error) {
    console.error('setLeadStatus failed', { id: parsed.data.id, code: error.code, message: error.message });
    return { ok: false, error: 'Could not update the lead. Please try again.' };
  }
  if (count === 0) return { ok: false, error: 'This lead no longer exists. Reload the page.' };

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export type AddLeadNoteResult = { ok: true; note: LeadNote } | { ok: false; error: string };

export async function addLeadNote(raw: { leadId: string; body: string }): Promise<AddLeadNoteResult> {
  await requireAdmin();
  const parsed = leadNoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid note.' };

  const supabase = await createSupabaseServerClient();
  // Author and time are set by the database.
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: parsed.data.leadId, body: parsed.data.body })
    .select('id, body, author_email, created_at')
    .single();
  if (error) {
    if (error.code === '23503') return { ok: false, error: 'This lead no longer exists. Reload the page.' };
    console.error('addLeadNote failed', { leadId: parsed.data.leadId, code: error.code, message: error.message });
    return { ok: false, error: 'Could not save the note. Please try again.' };
  }

  revalidatePath('/admin/leads');
  return {
    ok: true,
    note: { id: data.id, body: data.body, authorEmail: data.author_email, createdAt: data.created_at },
  };
}

export async function deleteLeadNote(id: string): Promise<LeadActionResult> {
  await requireAdmin();
  const parsed = leadNoteIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase.from('lead_notes').delete({ count: 'exact' }).eq('id', parsed.data);
  if (error) return { ok: false, error: 'Could not delete the note. Please try again.' };
  if (count === 0) return { ok: false, error: 'This note was already deleted.' };

  revalidatePath('/admin/leads');
  return { ok: true };
}
