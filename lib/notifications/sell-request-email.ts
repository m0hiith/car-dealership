import 'server-only';
import { FUEL_LABELS, OWNER_LABELS, TRANSMISSION_LABELS, type FuelType, type Transmission } from '@/lib/car-options';
import { formatKm, formatPriceFull } from '@/lib/format';
import { escapeHtml, sendOwnerEmail } from '@/lib/notifications/lead-email';
import { absoluteUrl } from '@/lib/site-url';

/**
 * Optional email to the owner for each new Sell Your Car request. Uses the
 * same switch and settings as enquiry emails (LEAD_EMAIL_ENABLED, RESEND_API_KEY,
 * LEAD_EMAIL_FROM, LEAD_EMAIL_TO). Never throws: a failed email must not
 * lose or block the request. Photos are not attached; they are in the dashboard.
 */

export type NewSellRequestEmail = {
  dealershipName: string;
  car: string;
  variant: string | null;
  kmsDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  owners: number;
  registration: string | null;
  expectedPrice: number | null;
  conditionNotes: string | null;
  photoCount: number;
  name: string;
  phone: string;
  preferredTime: string | null;
};

export function buildSellRequestEmail(r: NewSellRequestEmail) {
  const phone = /^\d{10}$/.test(r.phone) ? `${r.phone.slice(0, 5)} ${r.phone.slice(5)}` : r.phone;
  const rows: [string, string][] = [
    ['Name', r.name],
    ['Phone', phone],
    ...(r.preferredTime ? [['Best time', r.preferredTime] as [string, string]] : []),
    ['Car', [r.car, r.variant].filter(Boolean).join(' ')],
    ['Kilometres', formatKm(r.kmsDriven)],
    ['Fuel / gearbox', `${FUEL_LABELS[r.fuelType]}, ${TRANSMISSION_LABELS[r.transmission]}`],
    ['Ownership', OWNER_LABELS[Math.min(r.owners, 6)] ?? String(r.owners)],
    ...(r.registration ? [['Registration', r.registration] as [string, string]] : []),
    ['Expected price', r.expectedPrice !== null ? formatPriceFull(r.expectedPrice) : 'Not given'],
    ['Photos', r.photoCount ? `${r.photoCount} (see the dashboard)` : 'None'],
    ...(r.conditionNotes ? [['Condition notes', r.conditionNotes] as [string, string]] : []),
  ];
  const adminUrl = absoluteUrl('/admin/sell-requests?status=new');
  const subject = `Sell request from ${r.name} – ${r.car}`;

  const text = [...rows.map(([k, v]) => `${k}: ${v}`), '', `Open in the dashboard: ${adminUrl}`].join('\n');
  const html = `<div style="font-family:sans-serif;font-size:14px;color:#334155">
<p style="font-size:16px;color:#0B2857"><strong>New Sell Your Car request on the ${escapeHtml(r.dealershipName)} website</strong></p>
<table cellpadding="4">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748B;vertical-align:top">${escapeHtml(k)}</td><td style="white-space:pre-line">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>
<p><a href="${escapeHtml(adminUrl)}" style="color:#0662C4">Open in the dashboard</a></p>
</div>`;
  return { subject, text, html };
}

export async function sendNewSellRequestEmail(request: NewSellRequestEmail): Promise<void> {
  await sendOwnerEmail(buildSellRequestEmail(request), 'New sell request');
}
