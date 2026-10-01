import { buttonStyles, StarRating } from '@/components/ui';
import type { PublicTestimonial } from '@/lib/queries/homepage';
import { ReviewCarousel } from './review-carousel';
import { HomeSection } from './section';
import { VideoReel } from './video-reel';

type Summary = { rating: number; count: number };

/** Customer videos, a rating summary and a swipeable strip of reviews. Hidden when there is nothing to show. */
export function Testimonials({
  testimonials,
  videos,
  reviewsUrl,
  summary,
}: {
  testimonials: PublicTestimonial[];
  videos: string[];
  reviewsUrl: string | null;
  summary: Summary | null;
}) {
  if (testimonials.length === 0 && videos.length === 0) return null;
  const shown: Summary | null =
    summary ??
    (testimonials.length
      ? { rating: testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length, count: testimonials.length }
      : null);

  return (
    <HomeSection id="testimonials" title="What our customers say">
      <VideoReel urls={videos} label="Customer video" className="max-w-xl" />
      {shown && testimonials.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="flex shrink-0 items-center gap-4 rounded-card bg-chip px-5 py-4 md:w-48 md:flex-col md:gap-2 md:py-8">
            <p className="text-headline-xl-mobile text-navy tabular-nums md:text-headline-xl">
              {shown.rating.toFixed(1)}
            </p>
            <div className="flex flex-col gap-1 md:items-center">
              <StarRating rating={Math.round(shown.rating)} size={20} />
              <p className="text-body-sm text-muted">
                {shown.count.toLocaleString('en-IN')} review{shown.count === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <ReviewCarousel reviews={testimonials} />
          </div>
        </div>
      )}
      {reviewsUrl && testimonials.length > 0 && (
        <a
          href={reviewsUrl}
          target="_blank"
          rel="noopener"
          className={buttonStyles({
            variant: 'ghost',
            size: 'lg',
            className: 'self-center border-trust text-trust-ink hover:border-trust hover:bg-trust-soft',
          })}
        >
          View all reviews
        </a>
      )}
    </HomeSection>
  );
}
