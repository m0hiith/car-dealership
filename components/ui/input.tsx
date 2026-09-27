import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlStyles, describedBy, Field, type FieldProps } from './field';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps & { ref?: React.Ref<HTMLInputElement> };

export function Input({ id, label, hint, error, hideLabel, className, required, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, { hint, error })}
        className={cn(controlStyles, 'h-11 px-3', className)}
        {...props}
      />
    </Field>
  );
}
