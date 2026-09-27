import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlStyles, describedBy, Field, type FieldProps } from './field';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldProps & { ref?: React.Ref<HTMLTextAreaElement> };

export function Textarea({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, { hint, error })}
        className={cn(controlStyles, 'min-h-24 resize-y px-3 py-2.5', className)}
        {...props}
      />
    </Field>
  );
}
