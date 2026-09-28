import { useId } from 'react';
import { cn } from '@/lib/cn';
import { StarIcon } from './icons';

/** 1–5 star picker: a radio group, so arrow keys move between stars. */
export function RatingInput({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id?: string;
  label: string;
  value: number;
  onChange: (rating: number) => void;
  error?: string;
}) {
  const autoId = useId();
  const name = id ?? autoId;
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      className="flex flex-col gap-2"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="text-label-lg text-navy">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-control has-focus-visible:outline-2 has-focus-visible:outline-action"
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="sr-only">
              {n} star{n === 1 ? '' : 's'}
            </span>
            <StarIcon
              width={32}
              height={32}
              className={cn(
                'p-1 transition-colors',
                n <= value ? 'fill-highlight text-highlight' : 'text-input hover:text-highlight',
              )}
            />
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
