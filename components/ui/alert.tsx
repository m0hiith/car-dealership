import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { AlertIcon, InfoIcon } from './icons';

export type AlertTone = 'error' | 'info';

const tones: Record<AlertTone, { box: string; icon: typeof AlertIcon }> = {
  error: { box: 'border-danger/30 bg-danger-soft text-danger-dark', icon: AlertIcon },
  info: { box: 'border-action/30 bg-action-soft text-action-ink', icon: InfoIcon },
};

export type AlertProps = {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
};

/** Inline message above a form or section. Errors are announced (role="alert"). */
export function Alert({ tone = 'error', children, className }: AlertProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-control border px-3 py-2.5 text-body-md', box, className)}
    >
      <Icon width={18} height={18} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}
