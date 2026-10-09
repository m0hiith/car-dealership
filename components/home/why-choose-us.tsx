import { CheckIcon } from '@/components/ui/icons';
import type { WhyUsItem } from '@/lib/validation/content';
import { HomeSection } from './section';

/** Items edited in /admin/content. Hidden when there are none. */
export function WhyChooseUs({ items, title = 'Why choose us' }: { items: WhyUsItem[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <HomeSection id="why-us" title={title} tone="wash">
      <ul className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transform-none md:p-6"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-trust-soft text-trust-ink"
            >
              <CheckIcon width={20} height={20} />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-headline-sm text-navy">{item.title}</h3>
              {item.description && <p className="text-body-md text-muted">{item.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
