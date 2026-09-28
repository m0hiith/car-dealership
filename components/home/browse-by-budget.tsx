import Link from 'next/link';
import { chipStyles } from '@/components/ui';
import { BUDGET_BANDS, budgetHref } from '@/lib/browse-links';
import { HomeSection } from './section';

export function BrowseByBudget() {
  return (
    <HomeSection id="budgets" title="Browse by budget" className="pt-0 md:pt-0">
      <ul className="flex flex-wrap gap-3">
        {BUDGET_BANDS.map((band) => (
          <li key={band.label}>
            <Link href={budgetHref(band)} className={chipStyles({ className: 'h-11 px-5 text-label-lg' })}>
              {band.label}
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
