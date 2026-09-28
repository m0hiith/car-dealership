import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A homepage band: heading, optional intro and action link, then content. */
export function HomeSection({
  id,
  title,
  description,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('py-10 md:py-14', className)}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1">
            <h2 id={headingId} className="text-headline-lg-mobile text-navy md:text-headline-lg">
              {title}
            </h2>
            {description && <p className="max-w-2xl text-body-lg text-muted">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/** "View all" style text link for a section header. */
export const sectionLinkClass =
  'inline-flex items-center gap-1 self-start rounded-control text-label-lg text-action focus-ring hover:text-action-ink hover:underline sm:self-auto';
