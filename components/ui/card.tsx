import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Lifts to elevation level 2 with a tinted border on hover / focus-within. */
  interactive?: boolean;
  /** `none` for image-led cards that manage their own inner padding. */
  padding?: 'none' | 'md' | 'lg';
};

const paddings = { none: '', md: 'p-4', lg: 'p-6' } as const;

export function Card({ interactive = false, padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card shadow-card',
        interactive &&
          'transition-[box-shadow,border-color] focus-within:border-tint focus-within:shadow-card-hover hover:border-tint hover:shadow-card-hover',
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}
