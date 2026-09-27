import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

/** Numbered card with a heading; the car form is a single scrolling page of these. */
export function FormSection({
  id,
  step,
  title,
  description,
  children,
}: {
  id: string;
  step: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20">
      <Card padding="none">
        <header className="flex items-start gap-3 border-b border-border px-4 py-3 md:px-6">
          <span
            aria-hidden
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-label-md text-white"
          >
            {step}
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 id={headingId} className="text-headline-sm text-navy">
              {title}
            </h2>
            {description && <p className="text-body-sm text-muted">{description}</p>}
          </div>
        </header>
        <div className="flex flex-col gap-5 p-4 md:p-6">{children}</div>
      </Card>
    </section>
  );
}
