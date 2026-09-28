import Link from 'next/link';
import { cn } from '@/lib/cn';

export type StatusTab = { key: string; label: string; count: number; href: string; active: boolean };

/** Underlined tabs with counts. Links, so they work without JavaScript and keep search and filters. */
export function StatusTabBar({ label, tabs }: { label: string; tabs: StatusTab[] }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 border-b border-border md:w-full">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              scroll={false}
              className={cn(
                '-mb-px flex h-11 items-center gap-2 rounded-t-control border-b-2 px-3 text-label-lg whitespace-nowrap focus-ring transition-colors',
                tab.active ? 'border-action text-navy' : 'border-transparent text-muted hover:text-navy',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-label-sm tabular-nums',
                  tab.active ? 'bg-action-soft text-action-ink' : 'bg-chip text-chip-ink',
                )}
              >
                {tab.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
