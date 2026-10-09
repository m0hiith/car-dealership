import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { SellRequestStatusBadge } from '@/components/admin/status-badge';
import { StatusTabBar } from '@/components/admin/status-tab-bar';
import { buttonStyles, Card, EmptyState } from '@/components/ui';
import { CameraIcon, ChevronRightIcon, TagIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatKm, formatPriceLakh, formatRelativeDateTime } from '@/lib/format';
import { getSellRequests, type SellRequestSummary } from '@/lib/queries/admin-sell';
import { getRequestTime } from '@/lib/request-time';
import { removeAbandonedSellPhotos } from '@/lib/sell-photo-cleanup';
import { SELL_REQUEST_STATUS_LABELS, SELL_REQUEST_STATUSES } from '@/lib/sell-status';
import { parseSellRequestsParams, SELL_REQUESTS_PAGE_SIZE, sellRequestsHref } from '@/lib/validation/admin-sell';

export const metadata: Metadata = { title: 'Sell requests' };

export default async function SellRequestsPage({ searchParams }: PageProps<'/admin/sell-requests'>) {
  await requireAdmin();
  const params = parseSellRequestsParams(await searchParams);
  const data = await getSellRequests(params);
  const now = getRequestTime();
  // Tidy up photos from forms visitors never sent, without slowing the page.
  after(() => removeAbandonedSellPhotos());

  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: data.counts.all,
      href: sellRequestsHref(params, { status: undefined }),
      active: !params.status,
    },
    ...SELL_REQUEST_STATUSES.map((status) => ({
      key: status,
      label: SELL_REQUEST_STATUS_LABELS[status],
      count: data.counts[status],
      href: sellRequestsHref(params, { status }),
      active: params.status === status,
    })),
  ];

  return (
    <>
      <AdminPageHeader
        title="Sell requests"
        description={`${data.counts.all} ${data.counts.all === 1 ? 'request' : 'requests'} from the Sell Your Car form, newest first`}
        actions={
          <Link href="/sell" target="_blank" className={buttonStyles({ variant: 'ghost' })}>
            View form
          </Link>
        }
      />
      <StatusTabBar label="Filter by status" tabs={tabs} />
      {data.requests.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {data.requests.map((request) => (
              <li key={request.id}>
                <RequestRow request={request} now={now} />
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            pageSize={SELL_REQUESTS_PAGE_SIZE}
            href={(page) => sellRequestsHref(params, { page })}
          />
        </>
      ) : (
        <EmptyState
          icon={<TagIcon width={22} height={22} />}
          title={
            params.status
              ? `No requests marked ${SELL_REQUEST_STATUS_LABELS[params.status].toLowerCase()}`
              : 'No sell requests yet'
          }
          description={
            params.status ? undefined : 'Requests from the Sell Your Car page appear here as soon as they are sent.'
          }
          action={
            params.status ? (
              <Link
                href={sellRequestsHref(params, { status: undefined })}
                className={buttonStyles({ variant: 'ghost' })}
              >
                Show all requests
              </Link>
            ) : undefined
          }
        />
      )}
    </>
  );
}

function RequestRow({ request, now }: { request: SellRequestSummary; now: number }) {
  return (
    <Link href={`/admin/sell-requests/${request.id}`} className="block rounded-card focus-ring">
      <Card interactive className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-label-lg text-navy">
              {request.title}
              {request.variant && <span className="font-normal text-muted"> {request.variant}</span>}
            </h2>
            <SellRequestStatusBadge status={request.status} />
          </div>
          <p className="text-body-sm text-chip-ink">
            {request.name} · {request.phone}
          </p>
          <p className="flex flex-wrap gap-x-3 text-body-sm text-muted">
            <span>{formatKm(request.kmsDriven)}</span>
            {request.expectedPrice !== null && <span>Asks {formatPriceLakh(request.expectedPrice)}</span>}
            {request.photoCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <CameraIcon width={12} height={12} aria-hidden />
                {request.photoCount} {request.photoCount === 1 ? 'photo' : 'photos'}
              </span>
            )}
            <span>Sent {formatRelativeDateTime(request.createdAt, now)}</span>
            {request.followUpAt && <span>Follow up {formatDate(request.followUpAt)}</span>}
          </p>
        </div>
        <ChevronRightIcon width={18} height={18} className="shrink-0 text-muted" aria-hidden />
      </Card>
    </Link>
  );
}
