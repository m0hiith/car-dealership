import Link from 'next/link';
import { buttonStyles } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';

/** "Showing 21–40 of 57" with Previous / Next links for admin lists. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const link = buttonStyles({ variant: 'ghost', size: 'sm', className: 'bg-card' });

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-md text-muted">
        Showing <span className="font-semibold text-chip-ink tabular-nums">{from}</span>–
        <span className="font-semibold text-chip-ink tabular-nums">{to}</span> of{' '}
        <span className="font-semibold text-chip-ink tabular-nums">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={link} rel="prev">
              <ChevronLeftIcon width={16} height={16} />
              Previous
            </Link>
          ) : (
            <span className={link} aria-disabled>
              <ChevronLeftIcon width={16} height={16} />
              Previous
            </span>
          )}
          <span className="px-1 text-body-md text-muted tabular-nums">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={link} rel="next">
              Next
              <ChevronRightIcon width={16} height={16} />
            </Link>
          ) : (
            <span className={link} aria-disabled>
              Next
              <ChevronRightIcon width={16} height={16} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
