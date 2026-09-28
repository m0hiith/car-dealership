import { cn } from '@/lib/cn';
import { StarIcon } from './icons';

/** Read-only 1–5 stars. Screen readers hear "Rated 4 out of 5". */
export function StarRating({ rating, size = 16, className }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="sr-only">Rated {rating} out of 5</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          width={size}
          height={size}
          className={n <= rating ? 'fill-highlight text-highlight' : 'text-input'}
        />
      ))}
    </span>
  );
}
