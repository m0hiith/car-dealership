import 'server-only';
import { absoluteUrl } from '@/lib/site-url';

/**
 * Optional email to the owner for each new website enquiry, sent through
 * Resend's HTTP API (no SDK needed for one request). Off unless
 * LEAD_EMAIL_ENABLED=true and the key, recipient and sender are all set.
 * Never throws: a failed email must not lose or block the lead.
 */

type LeadEmailConfig = { apiKey: string; to: string[]; from: string };

export function leadEmailConfig(env: Record<string, string | undefined> = process.env): LeadEmailConfig | null {
  if (env.LEAD_EMAIL_ENABLED !== 'true') return null;
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.LEAD_EMAIL_FROM?.trim();
  const to = (env.LEAD_EMAIL_TO ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  if (!apiKey || !from || to.length === 0) {
    console.warn('LEAD_EMAIL_ENABLED is true but RESEND_API_KEY, LEAD_EMAIL_FROM or LEAD_EMAIL_TO is missing.');
    return null;
  }
  return { apiKey, to, from };
}

export type NewLeadEmail = {
  dealershipName: string;
  name: string;
  phone: string;
  email?: string;
  preferredTime?: string;
  message?: string | null;
  car?: { title: string; slug: string } | null;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function buildLeadEmail(lead: NewLeadEmail) {
  const phone = /^\d{10}$/.test(lead.phone) ? `${lead.phone.slice(0, 5)} ${lead.phone.slice(5)}` : lead.phone;
  const rows: [string, string][] = [
    ['Name', lead.name],
    ['Phone', phone],
    ...(lead.email ? [['Email', lead.email] as [string, string]] : []),
    ...(lead.car ? [['Car', `${lead.car.title} (${absoluteUrl(`/cars/${lead.car.slug}`)})`] as [string, string]] : []),
    ...(lead.preferredTime ? [['Best time', lead.preferredTime] as [string, string]] : []),
    ...(lead.message ? [['Message', lead.message] as [string, string]] : []),
  ];
  const adminUrl = absoluteUrl('/admin/leads?status=new');
  const subject = `New enquiry from ${lead.name}${lead.car ? ` – ${lead.car.title}` : ''}`;

  const text = [...rows.map(([k, v]) => `${k}: ${v}`), '', `Open in the dashboard: ${adminUrl}`].join('\n');
  const html = `<div style="font-family:sans-serif;font-size:14px;color:#334155">
<p style="font-size:16px;color:#0B2545"><strong>New enquiry on the ${escapeHtml(lead.dealershipName)} website</strong></p>
<table cellpadding="4">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748B;vertical-align:top">${escapeHtml(k)}</td><td style="white-space:pre-line">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>
<p><a href="${escapeHtml(adminUrl)}" style="color:#0284C7">Open in the dashboard</a></p>
</div>`;
  return { subject, text, html };
}

export async function sendNewLeadEmail(lead: NewLeadEmail): Promise<void> {
  const config = leadEmailConfig();
  if (!config) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to: config.to, ...buildLeadEmail(lead) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error('New-lead email failed', { status: res.status, body: (await res.text()).slice(0, 300) });
  } catch (e) {
    console.error('New-lead email failed', { message: e instanceof Error ? e.message : String(e) });
  }
}
