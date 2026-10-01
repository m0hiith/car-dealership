import Link from 'next/link';
import { HOME_BODY_TYPES } from '@/lib/browse-links';
import { BODY_TYPE_LABELS, type BodyType } from '@/lib/car-options';
import { BodyTypeIcon } from './body-type-icon';
import { HomeSection } from './section';

export function BrowseByBodyType({ counts }: { counts: Record<BodyType, number> }) {
  return (
    <HomeSection id="body-types" title="Browse by body type">
      <ul className="-mx-4 scrollbar-none flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {HOME_BODY_TYPES.map((type) => {
          const count = counts[type];
          return (
            <li key={type} className="w-36 shrink-0 snap-start md:w-auto">
              <Link
                href={`/cars/type/${type}`}
                className="group flex h-full flex-col items-center gap-3 rounded-card border border-border bg-card px-4 py-5 text-center shadow-card focus-ring transition-[box-shadow,border-color] hover:border-tint hover:shadow-card-hover"
              >
                <BodyTypeIcon type={type} className="h-10 w-20 text-navy transition-colors group-hover:text-trust" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-label-lg text-navy">{BODY_TYPE_LABELS[type]}</span>
                  <span className={count > 0 ? 'text-body-sm font-medium text-trust-ink' : 'text-body-sm text-muted'}>
                    {count > 0 ? `${count} car${count === 1 ? '' : 's'}` : 'None right now'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </HomeSection>
  );
}
