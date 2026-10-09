import 'server-only';
import { endOfKolkataDay, type FollowUpKind } from '@/lib/follow-up';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Follow-ups due today or overdue, across leads and sell requests. Runs as
// the signed-in user, so RLS limits it to admins. Callers must still call
// requireAdmin() first.

export type DueFollowUp = {
  kind: FollowUpKind;
  id: string;
  name: string;
  phone: string;
  /** What it is about: the car enquired about, or the car offered for sale. */
  subject: string | null;
  at: string;
  note: string | null;
  href: string;
};

const PER_TABLE = 25;

/** Due by the end of today (Asia/Kolkata), oldest first, overdue ones included. */
export async function getDueFollowUps(now: number): Promise<DueFollowUp[]> {
  const supabase = await createSupabaseServerClient();
  const until = new Date(endOfKolkataDay(now)).toISOString();

  const [leads, sells] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, name, phone, follow_up_at, follow_up_note, car:cars(year, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name))',
      )
      .not('follow_up_at', 'is', null)
      .lt('follow_up_at', until)
      .order('follow_up_at')
      .limit(PER_TABLE),
    supabase
      .from('sell_requests')
      .select('id, name, phone, follow_up_at, follow_up_note, year, brand_name, model_name')
      .not('follow_up_at', 'is', null)
      .lt('follow_up_at', until)
      .order('follow_up_at')
      .limit(PER_TABLE),
  ]);
  if (leads.error) throw new Error(`Could not load lead follow-ups: ${leads.error.message}`);
  if (sells.error) throw new Error(`Could not load sell request follow-ups: ${sells.error.message}`);

  const items: DueFollowUp[] = [
    ...leads.data.map((l) => ({
      kind: 'lead' as const,
      id: l.id,
      name: l.name,
      phone: l.phone,
      subject: l.car ? [l.car.year, l.car.brand?.name, l.car.model?.name].filter(Boolean).join(' ') : null,
      at: l.follow_up_at!,
      note: l.follow_up_note,
      // The leads list has no detail page; searching the number finds the card.
      href: `/admin/leads?q=${l.phone}`,
    })),
    ...sells.data.map((r) => ({
      kind: 'sell' as const,
      id: r.id,
      name: r.name,
      phone: r.phone,
      subject: `Selling ${r.year} ${r.brand_name} ${r.model_name}`,
      at: r.follow_up_at!,
      note: r.follow_up_note,
      href: `/admin/sell-requests/${r.id}`,
    })),
  ];
  return items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
