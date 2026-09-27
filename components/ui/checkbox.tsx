import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  /** Secondary text after the label, e.g. a result count. */
  meta?: ReactNode;
  ref?: React.Ref<HTMLInputElement>;
};

export function Checkbox({ id, label, meta, className, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-chip-ink has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative flex size-5 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            'peer size-5 cursor-pointer appearance-none rounded-sm border-[1.5px] border-control bg-card focus-ring transition-colors',
            'group-hover:border-action checked:border-navy checked:bg-navy disabled:cursor-not-allowed',
          )}
          {...props}
        />
        <CheckIcon
          width={14}
          height={14}
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="flex-1">{label}</span>
      {meta && <span className="text-body-sm text-muted">{meta}</span>}
    </label>
  );
}
