import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Shared visual base for text-like controls (Input, Textarea, Select). */
export const controlStyles = cn(
  'block w-full rounded-control border focus-field border-input bg-card text-body-lg text-navy transition-[border-color,box-shadow]',
  'placeholder:text-muted hover:border-control',
  'disabled:cursor-not-allowed disabled:bg-chip disabled:text-muted',
  'aria-invalid:border-danger aria-invalid:focus-visible:border-danger',
);

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Hides the label visually but keeps it for screen readers. */
  hideLabel?: boolean;
  required?: boolean;
};

/** Label, hint and error wrapper. Ids are wired by the caller. */
export function Field({
  id,
  label,
  hint,
  error,
  hideLabel,
  required,
  className,
  children,
}: FieldProps & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className={cn('text-label-lg text-navy', hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-body-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, { hint, error }: Pick<FieldProps, 'hint' | 'error'>) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
