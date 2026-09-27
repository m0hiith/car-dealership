import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlStyles, describedBy, Field, type FieldProps } from './field';
import { ChevronDownIcon } from './icons';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldProps & {
    options: SelectOption[];
    /** Adds an empty first option, e.g. "Any brand". */
    placeholder?: string;
    ref?: React.Ref<HTMLSelectElement>;
  };

/** Native select: keyboard, screen reader and mobile picker support for free. */
export function Select({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  required,
  options,
  placeholder,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field id={selectId} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, { hint, error })}
          className={cn(controlStyles, 'h-11 cursor-pointer appearance-none pr-10 pl-3', className)}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          width={18}
          height={18}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      </div>
    </Field>
  );
}
