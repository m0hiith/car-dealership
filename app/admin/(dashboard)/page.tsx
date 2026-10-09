import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { CarStatusBadge, LeadStatusBadge } from '@/components/admin/status-badge';
import { buttonStyles, Card, EmptyState } from '@/components/ui';
import { ChevronRightIcon, ClockIcon, PlusIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { followUpState, formatFollowUp } from '@/lib/follow-up';
import { formatDate, formatPriceLakh } from '@/lib/format';
import {
  getDashboardStats,
  getLatestLeads,
  getRecentCars,
  type LatestLead,
  type RecentCar,
} from '@/lib/queries/dashboard';
import { getNewSellRequestCount } from '@/lib/queries/admin-sell';
import { getDueFollowUps, type DueFollowUp } from '@/lib/queries/follow-ups';
import { getRequestTime } from '@/lib/request-time';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = getRequestTime();
  const [stats, cars, leads, newSellRequests, followUps] = await Promise.all([
    getDashboardStats(),
    getRecentCars(),
    getLatestLeads(),
    getNewSellRequestCount(),
    getDueFollowUps(now),
  ]);
  const overdue = followUps.filter((f) => followUpState(f.at, now) === 'overdue').length;

  const statCards = [
    { label: 'Total cars', value: stats.total, href: '/admin/cars' },
    { label: 'Published', value: stats.published, href: '/admin/cars?status=published' },
    { label: 'Reserved', value: stats.reserved, href: '/admin/cars?status=reserved' },
    { label: 'Sold', value: stats.sold, href: '/admin/cars?status=sold' },
    { label: 'New leads', value: stats.newLeads, href: '/admin/leads?status=new' },
    { label: 'New sell requests', value: newSellRequests, href: '/admin/sell-requests?status=new' },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        actions={
          <Link href="/admin/cars/new" className={buttonStyles()}>
            <PlusIcon width={18} height={18} />
            Add car
          </Link>
        }
      />

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <li key={card.label}>
            <Link href={card.href} className="block h-full rounded-card focus-ring">
              <Card interactive className="flex h-full flex-col gap-1">
                <span className="text-label-md text-muted">{card.label}</span>
                <span className="text-headline-lg-mobile text-navy tabular-nums md:text-headline-lg">
                  {card.value}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            <ClockIcon width={18} height={18} aria-hidden />
            Follow-ups today
          </h2>
          {followUps.length > 0 && (
            <span className="text-body-sm text-muted">
              {followUps.length} due{overdue > 0 && <span className="font-semibold text-danger"> · {overdue} overdue</span>}
            </span>
          )}
        </div>
        {followUps.length === 0 ? (
          <p className="px-4 py-6 text-body-md text-muted">
            Nothing due today. Set follow-ups on a lead or sell request to see them here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {followUps.map((item) => (
              <FollowUpRow key={`${item.kind}-${item.id}`} item={item} now={now} />
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recently added cars" href="/admin/cars">
          {cars.length === 0 ? (
            <EmptyState
              className="m-4"
              title="No cars yet"
              description="Cars you add will appear here."
              action={
                <Link href="/admin/cars/new" className={buttonStyles({ size: 'sm' })}>
                  Add your first car
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {cars.map((car) => (
                <CarRow key={car.id} car={car} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest leads" href="/admin/leads">
          {leads.length === 0 ? (
            <EmptyState
              className="m-4"
              title="No leads yet"
              description="Enquiries from the website will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-headline-sm text-navy">{title}</h2>
        <Link href={href} className="rounded-control text-label-lg text-action-ink focus-ring hover:underline">
          View all
        </Link>
      </div>
      {children}
    </Card>
  );
}

function carTitle(car: { year: number; brand: { name: string } | null; model: { name: string } | null }) {
  return [car.year, car.brand?.name, car.model?.name].filter(Boolean).join(' ');
}

function CarRow({ car }: { car: RecentCar }) {
  return (
    <li>
      <Link
        href={`/admin/cars/${car.id}/edit`}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label-lg text-navy">
            {carTitle(car)}
            {car.variant && <span className="font-normal text-muted"> {car.variant}</span>}
          </span>
          <span className="text-body-sm text-muted">
            <span className="font-semibold text-chip-ink">{formatPriceLakh(car.price)}</span> · Added{' '}
            {formatDate(car.created_at)}
          </span>
        </div>
        <CarStatusBadge status={car.status} />
      </Link>
    </li>
  );
}

function LeadRow({ lead }: { lead: LatestLead }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label-lg text-navy">{lead.name}</span>
        <span className="truncate text-body-sm text-muted">
          <a href={`tel:+91${lead.phone}`} className="text-action-ink hover:underline">
            {lead.phone}
          </a>{' '}
          · {lead.car ? carTitle(lead.car) : 'General enquiry'} · {formatDate(lead.created_at)}
        </span>
      </div>
      <LeadStatusBadge status={lead.status} />
    </li>
  );
}

function FollowUpRow({ item, now }: { item: DueFollowUp; now: number }) {
  const isOverdue = followUpState(item.at, now) === 'overdue';
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-4 border-l-4 px-4 py-3 transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none',
          isOverdue ? 'border-danger bg-danger-soft/60' : 'border-transparent',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label-lg text-navy">
            {item.name}
            <span className="font-normal text-muted"> · {item.kind === 'lead' ? 'Lead' : 'Sell request'}</span>
          </span>
          <span className="truncate text-body-sm text-muted">
            {[item.subject, item.note].filter(Boolean).join(' · ') || item.phone}
          </span>
        </div>
        <span
          className={cn('shrink-0 text-right text-body-sm tabular-nums', isOverdue ? 'font-semibold text-danger' : 'text-chip-ink')}
        >
          {isOverdue && <span className="block text-label-sm uppercase">Overdue</span>}
          {formatFollowUp(item.at, now)}
        </span>
        <ChevronRightIcon width={16} height={16} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
