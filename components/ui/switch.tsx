import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> & {
  label: ReactNode;
  description?: ReactNode;
};

/** On/off toggle (a native checkbox with role="switch"). */
export function Switch({ id, label, description, className, ...props }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-label-lg text-navy">{label}</span>
        {description && <span className="text-body-sm text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-input focus-ring transition-colors checked:bg-action disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-white shadow-card transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
        />
      </span>
    </label>
  );
}
