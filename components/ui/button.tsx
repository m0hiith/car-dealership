import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'light' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-card hover:bg-brand-dark',
  secondary: 'bg-brand-blue text-white hover:bg-brand',
  whatsapp: 'bg-trust-ink text-white shadow-card hover:bg-trust',
  light: 'bg-white text-navy shadow-card hover:bg-wash',
  ghost: 'border-[1.5px] border-input bg-transparent text-navy hover:border-action hover:bg-chip',
  danger: 'bg-danger text-white hover:bg-danger-dark',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-label-md',
  md: 'h-11 gap-2 px-4 text-label-lg',
  lg: 'h-12 gap-2 px-6 text-body-lg font-semibold',
};

/** Class string for anything that should look like a button (e.g. a `<Link>`). */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap focus-ring transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
