import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { CarStatus } from '@/lib/car-options';
import type { InventoryCounts } from '@/lib/queries/admin-cars';
import { inventoryHref, type InventoryParams } from '@/lib/validation/admin-cars';

const TABS: { status: CarStatus | undefined; label: string }[] = [
  { status: undefined, label: 'All' },
  { status: 'published', label: 'Published' },
  { status: 'draft', label: 'Draft' },
  { status: 'reserved', label: 'Reserved' },
  { status: 'sold', label: 'Sold' },
  { status: 'archived', label: 'Archived' },
];

/** Status tabs with counts. Links, so they work without JavaScript and keep search and filters. */
export function StatusTabs({ params, counts }: { params: InventoryParams; counts: InventoryCounts }) {
  return (
    <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 border-b border-border md:w-full">
        {TABS.map((tab) => {
          const active = params.status === tab.status;
          const count = counts[tab.status ?? 'all'];
          return (
            <li key={tab.label}>
              <Link
                href={inventoryHref(params, { status: tab.status })}
                aria-current={active ? 'page' : undefined}
                scroll={false}
                className={cn(
                  '-mb-px flex h-11 items-center gap-2 rounded-t-control border-b-2 px-3 text-label-lg whitespace-nowrap focus-ring transition-colors',
                  active ? 'border-action text-navy' : 'border-transparent text-muted hover:text-navy',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-label-sm tabular-nums',
                    active ? 'bg-action-soft text-action-ink' : 'bg-chip text-chip-ink',
                  )}
                >
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
