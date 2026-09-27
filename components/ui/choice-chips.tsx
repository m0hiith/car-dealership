import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ChoiceChipOption<T extends string> = { value: T; label: string };

export type ChoiceChipsProps<T extends string> = {
  /** Applied to the first radio, so an error summary can focus the group. */
  id?: string;
  name: string;
  label: ReactNode;
  options: ReadonlyArray<ChoiceChipOption<T>>;
  value: T | '';
  onChange: (value: T) => void;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
};

/**
 * Single choice shown as large pills (native radios underneath), for short
 * option lists that are quicker to tap than a dropdown on a phone.
 */
export function ChoiceChips<T extends string>({
  id,
  name,
  label,
  options,
  value,
  onChange,
  error,
  hint,
  required,
  className,
}: ChoiceChipsProps<T>) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const messageId = error ? `${baseId}-error` : hint ? `${baseId}-hint` : undefined;

  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-1.5', className)} aria-describedby={messageId}>
      <legend className="mb-1.5 text-label-lg text-navy">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <label
            key={option.value}
            className={cn(
              'inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-label-lg whitespace-nowrap transition-colors select-none',
              'border-input bg-card text-chip-ink hover:border-tint hover:bg-chip',
              'has-checked:border-action has-checked:bg-action-soft has-checked:text-action-ink',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
              error && 'border-danger/60',
            )}
          >
            <input
              id={index === 0 ? baseId : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && !error && (
        <p id={`${baseId}-hint`} className="text-body-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${baseId}-error`} className="text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
