import Image from 'next/image';
import { StarRating } from '@/components/ui';
import type { PublicTestimonial } from '@/lib/queries/homepage';
import { HomeSection } from './section';

/** Published testimonials only. Hidden when there are none. */
export function Testimonials({ testimonials }: { testimonials: PublicTestimonial[] }) {
  if (testimonials.length === 0) return null;
  return (
    <HomeSection id="testimonials" title="What our customers say">
      <ul className="-mx-4 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {testimonials.map((t) => (
          <li key={t.id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto">
            <figure className="flex h-full flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-card md:p-6">
              <StarRating rating={t.rating} />
              <blockquote className="flex-1 text-body-lg whitespace-pre-line text-chip-ink">{t.review}</blockquote>
              <figcaption className="flex items-center gap-3">
                {t.customerImage ? (
                  <Image
                    src={t.customerImage}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-full bg-chip object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-full bg-chip text-label-lg text-navy"
                  >
                    {t.customerName.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-label-lg text-navy">{t.customerName}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
