import type { Metadata } from 'next';
import Link from 'next/link';
import { LeadCard } from '@/components/admin/leads/lead-card';
import { LeadsToolbar } from '@/components/admin/leads/leads-toolbar';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusTabBar } from '@/components/admin/status-tab-bar';
import { buttonStyles, EmptyState } from '@/components/ui';
import { InboxIcon, SearchIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from '@/lib/lead-status';
import { getLeads } from '@/lib/queries/admin-leads';
import { getDealershipName } from '@/lib/queries/settings';
import { getRequestTime } from '@/lib/request-time';
import { hasLeadFilters, leadsHref, LEADS_PAGE_SIZE, parseLeadsParams } from '@/lib/validation/admin-leads';

export const metadata: Metadata = { title: 'Leads' };

export default async function LeadsPage({ searchParams }: PageProps<'/admin/leads'>) {
  await requireAdmin();
  const params = parseLeadsParams(await searchParams);
  const [data, dealershipName] = await Promise.all([getLeads(params), getDealershipName()]);
  const filtered = hasLeadFilters(params);
  const now = getRequestTime();

  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: data.counts.all,
      href: leadsHref(params, { status: undefined }),
      active: !params.status,
    },
    ...LEAD_STATUSES.map((status) => ({
      key: status,
      label: LEAD_STATUS_LABELS[status],
      count: data.counts[status],
      href: leadsHref(params, { status }),
      active: params.status === status,
    })),
  ];

  let content;
  if (data.leads.length > 0) {
    content = (
      <>
        <ul className="flex flex-col gap-4">
          {data.leads.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} dealershipName={dealershipName} now={now} />
            </li>
          ))}
        </ul>
        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          pageSize={LEADS_PAGE_SIZE}
          href={(page) => leadsHref(params, { page })}
        />
      </>
    );
  } else if (filtered) {
    content = (
      <EmptyState
        icon={<SearchIcon width={22} height={22} />}
        title="No leads match"
        description="Try a different name or number, or clear the filters."
        action={
          <Link
            href={leadsHref(params, { q: undefined, car: undefined })}
            className={buttonStyles({ variant: 'ghost' })}
          >
            Clear search and filters
          </Link>
        }
      />
    );
  } else if (data.counts.all === 0) {
    content = (
      <EmptyState
        icon={<InboxIcon width={22} height={22} />}
        title="No leads yet"
        description="Enquiries from the website appear here as soon as they are sent."
      />
    );
  } else {
    content = (
      <EmptyState
        icon={<InboxIcon width={22} height={22} />}
        title={params.status ? `No leads marked ${LEAD_STATUS_LABELS[params.status].toLowerCase()}` : 'No leads'}
        action={
          <Link href={leadsHref(params, { status: undefined })} className={buttonStyles({ variant: 'ghost' })}>
            Show all leads
          </Link>
        }
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Leads"
        description={
          filtered ? undefined : `${data.counts.all} ${data.counts.all === 1 ? 'enquiry' : 'enquiries'}, newest first`
        }
      />
      <StatusTabBar label="Filter by status" tabs={tabs} />
      <LeadsToolbar params={params} cars={data.cars} />
      {content}
    </>
  );
}
