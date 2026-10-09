import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';

/** A homepage band: heading, optional intro and action link, then content. */
export function HomeSection({
  id,
  title,
  description,
  action,
  tone = 'wash',
  className,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Bands alternate on the navy page: `plain` and `wash` (a slightly lighter navy). */
  tone?: 'plain' | 'wash';
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('py-10 md:py-14', tone === 'plain' ? undefined : 'bg-band-wash', className)}
    >
      <Reveal className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1">
            <span aria-hidden className="mb-2 h-1 w-10 rounded-full bg-linear-to-r from-action to-trust" />
            <h2 id={headingId} className="text-headline-lg-mobile text-navy md:text-headline-lg">
              {title}
            </h2>
            {description && <p className="max-w-2xl text-body-lg text-muted">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </Reveal>
    </section>
  );
}

/** "View all" style text link for a section header. */
export const sectionLinkClass =
  'inline-flex items-center gap-1 self-start rounded-control text-label-lg text-action-ink focus-ring hover:text-navy hover:underline sm:self-auto';
