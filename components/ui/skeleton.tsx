import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Loading placeholder. Size it with utility classes (h-4 w-32, aspect-[16/10], ...). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-chip motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
