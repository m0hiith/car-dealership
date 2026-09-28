import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  /** Toggle chip (filter option). Sets aria-pressed. */
  selected?: boolean;
  /** Removable chip (active filter). Renders a × and labels the button "Remove …". */
  onRemove?: () => void;
};

/** Class string for a link that should look like a chip (e.g. a budget shortcut). */
export function chipStyles({ selected = false, className }: { selected?: boolean; className?: string } = {}) {
  return cn(
    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-label-md whitespace-nowrap focus-ring transition-colors',
    selected
      ? 'border-action bg-action-soft text-action-ink hover:border-action-ink'
      : 'border-border bg-card text-chip-ink hover:border-tint hover:bg-chip',
    className,
  );
}

/**
 * Interactive pill used for filter options and active filters.
 * Pass either `selected` + `onClick` (toggle) or `onRemove` (dismissible).
 */
export function Chip({ selected, onRemove, className, children, onClick, ...props }: ChipProps) {
  const removable = typeof onRemove === 'function';
  return (
    <button
      type="button"
      aria-pressed={removable ? undefined : Boolean(selected)}
      onClick={removable ? onRemove : onClick}
      className={chipStyles({ selected: selected || removable, className })}
      {...props}
    >
      {children}
      {removable && (
        <>
          <span className="sr-only">(remove)</span>
          <CloseIcon width={14} height={14} />
        </>
      )}
    </button>
  );
}
