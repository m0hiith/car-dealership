import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// /admin/feedback. Runs as the signed-in user, so RLS limits it to admins.
// Callers must still call requireAdmin() first.

export const FEEDBACK_PAGE_SIZE = 20;

export type FeedbackEntry = {
  id: string;
  rating: number;
  comment: string | null;
  phone: string | null;
  pageUrl: string | null;
  createdAt: string;
};

export type FeedbackSummary = {
  total: number;
  /** null when there is no feedback yet. */
  average: number | null;
  /** How many of each rating, 1 to 5. */
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function getFeedback(page: number) {
  const supabase = await createSupabaseServerClient();

  const ratings = [1, 2, 3, 4, 5] as const;
  const counted = await Promise.all(
    ratings.map(async (rating) => {
      const { count, error } = await supabase
        .from('site_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('rating', rating);
      if (error) throw new Error(`Could not count feedback: ${error.message}`);
      return [rating, count ?? 0] as const;
    }),
  );
  const counts = Object.fromEntries(counted) as FeedbackSummary['counts'];
  const total = counted.reduce((sum, [, n]) => sum + n, 0);
  const average = total ? counted.reduce((sum, [r, n]) => sum + r * n, 0) / total : null;

  const pageCount = Math.max(1, Math.ceil(total / FEEDBACK_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = (current - 1) * FEEDBACK_PAGE_SIZE;

  let entries: FeedbackEntry[] = [];
  if (total > 0) {
    const { data, error } = await supabase
      .from('site_feedback')
      .select('id, rating, comment, phone, page_url, created_at')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + FEEDBACK_PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load feedback: ${error.message}`);
    entries = data.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      phone: f.phone,
      pageUrl: f.page_url,
      createdAt: f.created_at,
    }));
  }

  return { summary: { total, average, counts } satisfies FeedbackSummary, entries, page: current, pageCount };
}
