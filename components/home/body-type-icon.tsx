import type { SVGProps } from 'react';
import type { BodyType } from '@/lib/car-options';

/**
 * Side-profile outlines for the body-type tiles (drawn for this site). Each
 * roofline runs from the rear bumper at x0 to the front bumper at x1; the
 * sills and both wheels are shared.
 */
const SHAPES: Record<BodyType, { roof: string; x0: number; x1: number }> = {
  hatchback: { roof: 'M6 26V16l6-6h26l10 7 8 2v7', x0: 6, x1: 56 },
  sedan: { roof: 'M4 26v-6l8-3 8-7h18l8 7 10 2 4 2v5', x0: 4, x1: 60 },
  suv: { roof: 'M6 26V10l4-3h30l8 8 8 2v9', x0: 6, x1: 56 },
  muv: { roof: 'M4 26V9l4-2h30l10 8 10 2v9', x0: 4, x1: 58 },
  luxury: { roof: 'M4 26v-5l8-3 10-7h14l10 6 12 3v6', x0: 4, x1: 58 },
  coupe: { roof: 'M4 26v-5l6-3 14-8h10l12 7 10 3v6', x0: 4, x1: 56 },
  convertible: { roof: 'M4 26v-7h14l6-5 4 5h22l8 2v5', x0: 4, x1: 58 },
};

export function BodyTypeIcon({ type, ...props }: SVGProps<SVGSVGElement> & { type: BodyType }) {
  const { roof, x0, x1 } = SHAPES[type];
  return (
    <svg
      viewBox="0 0 64 32"
      width={64}
      height={32}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      <path d={`${roof}M${x0} 26H12M20 26H42M50 26H${x1}`} />
      <circle cx="16" cy="26" r="4" />
      <circle cx="46" cy="26" r="4" />
    </svg>
  );
}
