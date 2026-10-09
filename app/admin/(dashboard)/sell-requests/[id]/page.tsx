/* eslint-disable @next/next/no-img-element -- photos are short-lived signed URLs from a private bucket */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { FollowUpEditor } from '@/components/admin/follow-up-editor';
import { SellRequestEditor } from '@/components/admin/sell/sell-request-editor';
import { SellRequestStatusBadge } from '@/components/admin/status-badge';
import { buttonStyles, Card } from '@/components/ui';
import { ChevronLeftIcon, ImageIcon, PhoneIcon, WhatsAppIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { FUEL_LABELS, OWNER_LABELS, TRANSMISSION_LABELS } from '@/lib/car-options';
import { telHref, whatsappHref } from '@/lib/contact';
import { formatDate, formatKm, formatPriceFull, formatRelativeDateTime } from '@/lib/format';
import { getSellRequest } from '@/lib/queries/admin-sell';
import { getRequestTime } from '@/lib/request-time';

export const metadata: Metadata = { title: 'Sell request' };

export default async function SellRequestPage({ params }: PageProps<'/admin/sell-requests/[id]'>) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const request = await getSellRequest(id);
  if (!request) notFound();

  const call = telHref(request.phone);
  const whatsapp = whatsappHref(request.phone, `Hi ${request.name}, about your ${request.title} on our website.`);
  const registration = [request.registrationState, request.registrationCity].filter(Boolean).join(', ');

  return (
    <>
      <Link
        href="/admin/sell-requests"
        className="inline-flex items-center gap-1 self-start rounded-control text-label-lg text-action-ink focus-ring hover:underline"
      >
        <ChevronLeftIcon width={16} height={16} aria-hidden />
        All sell requests
      </Link>
      <AdminPageHeader
        title={request.title}
        description={
          <>
            Sent {formatRelativeDateTime(request.createdAt, getRequestTime())} · {formatDate(request.createdAt)}
          </>
        }
        actions={<SellRequestStatusBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-navy">Seller</h2>
            <Facts>
              <Fact label="Name">{request.name}</Fact>
              <Fact label="Mobile">{request.phone}</Fact>
              {request.preferredTime && <Fact label="Best time">{request.preferredTime}</Fact>}
            </Facts>
            <div className="flex flex-wrap gap-3">
              {call && (
                <a href={call} className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                  <PhoneIcon width={16} height={16} />
                  Call
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'whatsapp', size: 'sm' })}
                >
                  <WhatsAppIcon width={16} height={16} />
                  WhatsApp
                </a>
              )}
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-navy">Car</h2>
            <Facts>
              <Fact label="Car">{request.title}</Fact>
              {request.variant && <Fact label="Variant">{request.variant}</Fact>}
              <Fact label="Kilometres">{formatKm(request.kmsDriven)}</Fact>
              <Fact label="Fuel">{FUEL_LABELS[request.fuelType]}</Fact>
              <Fact label="Transmission">{TRANSMISSION_LABELS[request.transmission]}</Fact>
              <Fact label="Ownership">{OWNER_LABELS[Math.min(request.owners, 6)]}</Fact>
              {registration && <Fact label="Registration">{registration}</Fact>}
              <Fact label="Expected price">
                {request.expectedPrice !== null ? formatPriceFull(request.expectedPrice) : 'Not given'}
              </Fact>
            </Facts>
            {request.conditionNotes && (
              <div className="flex flex-col gap-1">
                <h3 className="text-label-md text-muted">Condition notes</h3>
                <p className="text-body-md whitespace-pre-line text-chip-ink">{request.conditionNotes}</p>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-navy">Photos ({request.photos.length})</h2>
            {request.photos.length === 0 ? (
              <p className="text-body-md text-muted">The seller did not add photos.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {request.photos.map((photo, i) => (
                  <li key={photo.path}>
                    {photo.url ? (
                      <a
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-4/3 overflow-hidden rounded-control border border-border bg-chip focus-ring"
                      >
                        <img
                          src={photo.url}
                          alt={`Photo ${i + 1} of ${request.title}`}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-4/3 flex-col items-center justify-center gap-1 rounded-control border border-border bg-chip text-body-sm text-muted">
                        <ImageIcon width={20} height={20} aria-hidden />
                        Photo unavailable
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-navy">Follow-up</h2>
            <FollowUpEditor
              key={`${request.followUpAt}-${request.followUpNote}`}
              kind="sell"
              id={request.id}
              at={request.followUpAt}
              note={request.followUpNote}
              now={getRequestTime()}
            />
          </Card>
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-navy">Status and notes</h2>
            <SellRequestEditor
              key={request.notes ?? ''}
              id={request.id}
              status={request.status}
              notes={request.notes}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label-md text-muted">{label}</dt>
      <dd className="text-body-md text-navy">{children}</dd>
    </div>
  );
}
