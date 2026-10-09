import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Photos uploaded on /sell by visitors who never sent the form. Each sweep
 * looks at the oldest uploads and deletes those older than ABANDONED_AFTER_MS
 * that no saved request uses. It runs in the background after each request
 * is sent and when staff open the list, so no scheduled job is needed.
 * Never throws: cleanup must not break the page or the form.
 */

const BUCKET = 'sell-requests';
const FOLDER = 'uploads';
/** Long enough that someone filling the form slowly never loses a photo. */
export const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;

/** Paths uploaded before the cutoff, from a storage listing. */
export function abandonedCandidates(files: { name: string; created_at?: string | null }[], now: number): string[] {
  const cutoff = now - ABANDONED_AFTER_MS;
  return files.flatMap((file) => {
    const created = file.created_at ? Date.parse(file.created_at) : Number.NaN;
    // A missing or unreadable date is kept: only delete what is clearly old.
    return Number.isFinite(created) && created < cutoff ? [`${FOLDER}/${file.name}`] : [];
  });
}

export async function removeAbandonedSellPhotos(now = Date.now()): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const storage = admin.storage.from(BUCKET);
    const { data: files, error: listError } = await storage.list(FOLDER, {
      limit: BATCH,
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (listError) throw listError;

    const candidates = abandonedCandidates(files ?? [], now);
    if (candidates.length === 0) return;

    const { data: used, error: usedError } = await admin
      .from('sell_requests')
      .select('photo_paths')
      .overlaps('photo_paths', candidates);
    if (usedError) throw usedError;

    const keep = new Set(used.flatMap((r) => r.photo_paths));
    const remove = candidates.filter((path) => !keep.has(path));
    if (remove.length === 0) return;

    const { error: removeError } = await storage.remove(remove);
    if (removeError) throw removeError;
  } catch (e) {
    console.error('Sell photo cleanup failed', { message: e instanceof Error ? e.message : String(e) });
  }
}
