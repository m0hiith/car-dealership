import 'server-only';
import { leadEmailConfig, sendOwnerEmail } from '@/lib/notifications/lead-email';
import { buildFollowUpReminderEmail, type DueReminder } from '@/lib/notifications/follow-up-email';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * The reminder job (app/api/cron/follow-ups, daily via Vercel Cron): finds
 * follow-ups that are due and not yet reminded, emails staff one list, then
 * marks them reminded. Uses the service-role client: there is no signed-in
 * user, and the route checks CRON_SECRET first.
 *
 * Nothing is marked unless the email was sent, so turning email on later
 * still delivers what is due. Each row is only marked if its follow-up time
 * is unchanged, so a follow-up rescheduled meanwhile keeps its own reminder.
 */

const BATCH = 50;

export type ReminderRun =
  | { status: 'email-off'; due: number }
  | { status: 'nothing-due' }
  | { status: 'sent'; due: number; marked: number }
  | { status: 'send-failed'; due: number };

export async function runFollowUpReminders(now = Date.now()): Promise<ReminderRun> {
  const admin = createSupabaseAdminClient();
  const dueBy = new Date(now).toISOString();

  const [leads, sells, settings] = await Promise.all([
    admin
      .from('leads')
      .select(
        'id, name, phone, follow_up_at, follow_up_note, car:cars(year, brand:brands(name), model:models!cars_model_id_brand_id_fkey(name))',
      )
      .eq('reminder_sent', false)
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', dueBy)
      .order('follow_up_at')
      .limit(BATCH),
    admin
      .from('sell_requests')
      .select('id, name, phone, follow_up_at, follow_up_note, year, brand_name, model_name')
      .eq('reminder_sent', false)
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', dueBy)
      .order('follow_up_at')
      .limit(BATCH),
    admin.from('site_settings').select('dealership_name').eq('id', 1).maybeSingle(),
  ]);
  if (leads.error) throw new Error(`Could not load due lead follow-ups: ${leads.error.message}`);
  if (sells.error) throw new Error(`Could not load due sell follow-ups: ${sells.error.message}`);

  const due: DueReminder[] = [
    ...leads.data.map((l) => ({
      kind: 'lead' as const,
      id: l.id,
      name: l.name,
      phone: l.phone,
      subject: l.car ? [l.car.year, l.car.brand?.name, l.car.model?.name].filter(Boolean).join(' ') : null,
      at: l.follow_up_at!,
      note: l.follow_up_note,
    })),
    ...sells.data.map((r) => ({
      kind: 'sell' as const,
      id: r.id,
      name: r.name,
      phone: r.phone,
      subject: `Selling ${r.year} ${r.brand_name} ${r.model_name}`,
      at: r.follow_up_at!,
      note: r.follow_up_note,
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  if (due.length === 0) return { status: 'nothing-due' };
  if (!leadEmailConfig()) return { status: 'email-off', due: due.length };

  const dealershipName = settings.data?.dealership_name || 'dealership';
  const sent = await sendOwnerEmail(buildFollowUpReminderEmail(due, dealershipName, now), 'Follow-up reminder');
  if (!sent) return { status: 'send-failed', due: due.length };

  const results = await Promise.all(
    due.map((r) =>
      admin
        .from(r.kind === 'lead' ? 'leads' : 'sell_requests')
        .update({ reminder_sent: true }, { count: 'exact' })
        .eq('id', r.id)
        .eq('follow_up_at', r.at),
    ),
  );
  for (const res of results) {
    if (res.error) console.error('Could not mark a follow-up reminded', { message: res.error.message });
  }
  return { status: 'sent', due: due.length, marked: results.reduce((n, res) => n + (res.count ?? 0), 0) };
}
