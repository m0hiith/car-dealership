import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'green' | 'amber' | 'blue';

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-chip text-chip-ink', dot: 'bg-muted' },
  green: { badge: 'bg-trust-soft text-trust-ink', dot: 'bg-trust' },
  amber: { badge: 'bg-reserved-soft text-reserved-ink', dot: 'bg-reserved' },
  blue: { badge: 'bg-action-soft text-action-ink', dot: 'bg-action' },
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  /**
   * green = genuine trust signals only (1st Owner, success).
   * amber = Reserved only. See CLAUDE.md §4.
   */
  tone?: BadgeTone;
  /** Small solid dot in the tone's base colour. */
  dot?: boolean;
  /** `spec` is the larger sentence-case pill for car attributes (Petrol, Automatic). */
  size?: 'status' | 'spec';
};

/** Static, non-interactive pill. Use `Chip` for anything clickable. */
export function Badge({ tone = 'neutral', dot = false, size = 'status', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full whitespace-nowrap',
        size === 'status' ? 'px-2.5 py-1 text-label-sm uppercase' : 'px-3 py-1.5 text-label-md',
        tones[tone].badge,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full', tones[tone].dot)} aria-hidden />}
      {children}
    </span>
  );
}
