import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { buttonStyles, Card, EmptyState, StarRating } from '@/components/ui';
import { PhoneIcon, StarIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { telHref } from '@/lib/contact';
import { formatRelativeDateTime } from '@/lib/format';
import { FEEDBACK_PAGE_SIZE, getFeedback } from '@/lib/queries/admin-feedback';
import { getRequestTime } from '@/lib/request-time';
import { FEEDBACK_RATINGS } from '@/lib/validation/feedback';

export const metadata: Metadata = { title: 'Feedback' };

const average = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function FeedbackPage({ searchParams }: PageProps<'/admin/feedback'>) {
  await requireAdmin();
  const raw = (await searchParams).page;
  const requested = Number(Array.isArray(raw) ? raw[0] : raw);
  const { summary, entries, page, pageCount } = await getFeedback(
    Number.isInteger(requested) && requested > 0 ? requested : 1,
  );
  const now = getRequestTime();

  return (
    <>
      <AdminPageHeader
        title="Feedback"
        description="Answers from the feedback popup on the website, newest first."
        actions={
          <Link href="/admin/settings#feedback" className={buttonStyles({ variant: 'ghost' })}>
            Popup settings
          </Link>
        }
      />

      {summary.total === 0 ? (
        <EmptyState
          icon={<StarIcon width={22} height={22} />}
          title="No feedback yet"
          description="Visitors see the popup after browsing for a while. Turn it on or change the timing in Settings."
        />
      ) : (
        <>
          <Card className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex flex-col gap-1 md:w-48">
              <span className="text-label-md text-muted">Average rating</span>
              <span className="text-headline-lg-mobile text-navy tabular-nums md:text-headline-lg">
                {average.format(summary.average ?? 0)}
                <span className="text-headline-sm text-muted"> / 5</span>
              </span>
              <StarRating rating={Math.round(summary.average ?? 0)} />
              <span className="text-body-sm text-muted">
                From {summary.total} {summary.total === 1 ? 'answer' : 'answers'}
              </span>
            </div>
            <ul className="flex flex-1 flex-col gap-2" aria-label="Answers by rating">
              {[...FEEDBACK_RATINGS].reverse().map((r) => {
                const n = summary.counts[r.value];
                const share = summary.total ? Math.round((n / summary.total) * 100) : 0;
                return (
                  <li key={r.value} className="flex items-center gap-3 text-body-sm">
                    <span className="w-20 shrink-0 text-chip-ink">
                      <span aria-hidden>{r.emoji}</span> {r.label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip" aria-hidden>
                      <span className="block h-full rounded-full bg-action" style={{ width: `${share}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-muted tabular-nums">
                      {n} · {share}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <ul className="flex flex-col gap-3">
            {entries.map((entry) => {
              const r = FEEDBACK_RATINGS[entry.rating - 1];
              const call = entry.phone ? telHref(entry.phone) : null;
              return (
                <li key={entry.id}>
                  <Card className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-label-lg text-navy">
                        <span aria-hidden className="text-xl leading-none">
                          {r?.emoji}
                        </span>
                        {r?.label} ({entry.rating}/5)
                      </span>
                      <span className="text-body-sm text-muted">
                        {formatRelativeDateTime(entry.createdAt, now)}
                        {entry.pageUrl && <> · on {entry.pageUrl}</>}
                      </span>
                    </div>
                    {entry.comment ? (
                      <p className="text-body-md whitespace-pre-line text-chip-ink">{entry.comment}</p>
                    ) : (
                      <p className="text-body-sm text-muted">No comment.</p>
                    )}
                    {call && (
                      <a
                        href={call}
                        className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'self-start' })}
                      >
                        <PhoneIcon width={14} height={14} />
                        <span className="tabular-nums">{entry.phone}</span>
                      </a>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={summary.total}
            pageSize={FEEDBACK_PAGE_SIZE}
            href={(p) => (p > 1 ? `/admin/feedback?page=${p}` : '/admin/feedback')}
          />
        </>
      )}
    </>
  );
}
