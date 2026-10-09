import 'server-only';
import { formatFollowUp, type FollowUpKind } from '@/lib/follow-up';
import { escapeHtml } from '@/lib/notifications/lead-email';
import { absoluteUrl } from '@/lib/site-url';

/** One email listing every follow-up that has just come due. */

export type DueReminder = {
  kind: FollowUpKind;
  id: string;
  name: string;
  phone: string;
  subject: string | null;
  at: string;
  note: string | null;
};

function link(r: DueReminder) {
  return absoluteUrl(r.kind === 'lead' ? `/admin/leads?q=${r.phone}` : `/admin/sell-requests/${r.id}`);
}

export function buildFollowUpReminderEmail(reminders: DueReminder[], dealershipName: string, now: number) {
  const phone = (p: string) => (/^\d{10}$/.test(p) ? `${p.slice(0, 5)} ${p.slice(5)}` : p);
  const subject =
    reminders.length === 1 ? `Follow-up due: ${reminders[0]!.name}` : `${reminders.length} follow-ups due`;

  const lines = reminders.map((r) => {
    const what = [r.kind === 'lead' ? 'Lead' : 'Sell request', r.subject, r.note].filter(Boolean).join(' · ');
    return { r, what, when: formatFollowUp(r.at, now) };
  });

  const text = [
    `Follow-ups due on the ${dealershipName} dashboard:`,
    '',
    ...lines.map(({ r, what, when }) => `${when} – ${r.name}, ${phone(r.phone)}\n  ${what}\n  ${link(r)}`),
    '',
    `Dashboard: ${absoluteUrl('/admin')}`,
  ].join('\n');

  const html = `<div style="font-family:sans-serif;font-size:14px;color:#334155">
<p style="font-size:16px;color:#0B2857"><strong>Follow-ups due on the ${escapeHtml(dealershipName)} dashboard</strong></p>
<table cellpadding="6" style="border-collapse:collapse">${lines
    .map(
      ({ r, what, when }) =>
        `<tr style="border-top:1px solid #E2E8F0"><td style="color:#64748B;vertical-align:top;white-space:nowrap">${escapeHtml(when)}</td><td><strong>${escapeHtml(r.name)}</strong>, ${escapeHtml(phone(r.phone))}<br>${escapeHtml(what)}<br><a href="${escapeHtml(link(r))}" style="color:#0662C4">Open</a></td></tr>`,
    )
    .join('')}</table>
<p><a href="${escapeHtml(absoluteUrl('/admin'))}" style="color:#0662C4">Open the dashboard</a></p>
</div>`;
  return { subject, text, html };
}
