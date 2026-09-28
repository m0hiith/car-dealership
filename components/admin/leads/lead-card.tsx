import Image from 'next/image';
import Link from 'next/link';
import { CarStatusBadge, LeadStatusBadge } from '@/components/admin/status-badge';
import { buttonStyles, Card } from '@/components/ui';
import { ChevronDownIcon, ClockIcon, ImageIcon, MailIcon, PhoneIcon, QuoteIcon } from '@/components/ui/icons';
import { telHref, whatsappHref } from '@/lib/contact';
import { formatRelativeDateTime } from '@/lib/format';
import type { AdminLead } from '@/lib/queries/admin-leads';
import { LeadNotes } from './lead-notes';
import { LeadStatusSelect } from './lead-status-select';

/** "98765 43210" */
function displayPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

function whatsappMessage(lead: AdminLead, dealershipName: string) {
  const first = lead.name.trim().split(/\s+/)[0];
  const car = lead.car ? ` about the ${[lead.car.title, lead.car.variant].filter(Boolean).join(' ')}` : '';
  return `Hi ${first}, this is ${dealershipName || 'the dealership'}. Thanks for your enquiry${car}.`;
}

export function LeadCard({ lead, dealershipName, now }: { lead: AdminLead; dealershipName: string; now: number }) {
  const call = telHref(lead.phone);
  const whatsapp = whatsappHref(lead.phone, whatsappMessage(lead, dealershipName));
  const headingId = `lead-${lead.id}`;

  return (
    <Card padding="none" className="flex flex-col" aria-labelledby={headingId} role="article">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={headingId} className="text-headline-sm text-navy">
                {lead.name}
              </h2>
              {lead.status === 'new' && <LeadStatusBadge status="new" />}
            </div>
            <p className="text-body-sm text-muted">
              <time dateTime={lead.createdAt}>{formatRelativeDateTime(lead.createdAt, now)}</time>
              {lead.source === 'car_detail' ? ' · from a car page' : ' · from the website'}
            </p>
          </div>
          <LeadStatusSelect leadId={lead.id} leadName={lead.name} status={lead.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          {call && (
            <a href={call} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              <PhoneIcon width={16} height={16} />
              <span className="tabular-nums">{displayPhone(lead.phone)}</span>
            </a>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <QuoteIcon width={16} height={16} />
              WhatsApp
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              <MailIcon width={16} height={16} />
              <span className="max-w-48 truncate">{lead.email}</span>
            </a>
          )}
        </div>

        {lead.car && (
          <Link
            href={`/admin/cars/${lead.car.id}/edit`}
            className="flex items-center gap-3 rounded-control border border-border p-2 focus-ring transition-colors hover:border-tint hover:bg-canvas"
          >
            <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-chip text-muted">
              {lead.car.coverUrl ? (
                <Image src={lead.car.coverUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <ImageIcon width={18} height={18} />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-label-lg text-navy">{lead.car.title}</span>
              {lead.car.variant && <span className="truncate text-body-sm text-muted">{lead.car.variant}</span>}
            </span>
            {lead.car.status !== 'published' && <CarStatusBadge status={lead.car.status} />}
          </Link>
        )}

        {(lead.message || lead.preferredTime) && (
          <div className="flex flex-col gap-2">
            {lead.message && <p className="text-body-md whitespace-pre-line text-chip-ink">{lead.message}</p>}
            {lead.preferredTime && (
              <p className="inline-flex items-center gap-2 text-body-sm text-muted">
                <ClockIcon width={14} height={14} />
                Prefers: {lead.preferredTime}
              </p>
            )}
          </div>
        )}
      </div>

      <details className="group border-t border-border" open={lead.notes.length > 0 || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-label-lg text-navy focus-ring md:px-6 [&::-webkit-details-marker]:hidden">
          Internal notes{lead.notes.length > 0 && ` (${lead.notes.length})`}
          <ChevronDownIcon width={18} height={18} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <LeadNotes leadId={lead.id} notes={lead.notes} now={now} />
        </div>
      </details>
    </Card>
  );
}
