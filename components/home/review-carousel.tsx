'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { StarRating } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import type { PublicTestimonial } from '@/lib/queries/homepage';

const LONG_REVIEW = 180;

/** Swipeable strip of review cards, with arrows on larger screens and "Read more" on long reviews. */
export function ReviewCarousel({ reviews }: { reviews: PublicTestimonial[] }) {
  const strip = useRef<HTMLUListElement>(null);

  function scroll(direction: 1 | -1) {
    const el = strip.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <div className="mb-3 hidden justify-end gap-2 md:flex">
        {([-1, 1] as const).map((direction) => {
          const Icon = direction === -1 ? ChevronLeftIcon : ChevronRightIcon;
          return (
            <button
              key={direction}
              type="button"
              onClick={() => scroll(direction)}
              aria-label={direction === -1 ? 'Previous reviews' : 'Next reviews'}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-navy shadow-card focus-ring transition-colors hover:border-trust hover:text-trust"
            >
              <Icon width={18} height={18} />
            </button>
          );
        })}
      </div>
      <ul
        ref={strip}
        className="relative -mx-4 scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {reviews.map((review) => (
          <li key={review.id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-[calc((100%-2rem)/3)]">
            <ReviewCard review={review} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ review }: { review: PublicTestimonial }) {
  const [open, setOpen] = useState(false);
  const long = review.review.length > LONG_REVIEW;

  return (
    <figure className="flex h-full min-h-56 flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover md:p-5">
      <figcaption className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {review.customerImage ? (
            <Image
              src={review.customerImage}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full bg-chip object-cover"
            />
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body-lg font-medium text-navy">{review.customerName}</span>
            {review.reviewedWhen && <span className="truncate text-body-sm text-muted">{review.reviewedWhen}</span>}
          </span>
        </span>
        <StarRating rating={review.rating} size={16} className="shrink-0 gap-0.5" />
      </figcaption>
      <div className="flex-1">
        <blockquote className={`text-body-md whitespace-pre-line text-chip-ink ${long && !open ? 'line-clamp-4' : ''}`}>
          {review.review}
        </blockquote>
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-end rounded-control text-label-lg text-muted underline focus-ring hover:text-navy"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </figure>
  );
}
