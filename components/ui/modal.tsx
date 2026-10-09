'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';
import { useDialog } from './use-dialog';

export function DialogCloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        '-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-control text-muted focus-ring transition-colors hover:bg-chip hover:text-navy',
        className,
      )}
    >
      <CloseIcon width={20} height={20} />
    </button>
  );
}

const fade =
  'opacity-0 transition-[opacity,translate,display,overlay] transition-discrete duration-200 ease-out open:opacity-100 starting:open:opacity-0 motion-reduce:transition-none ' +
  'backdrop:bg-brand/50 backdrop:opacity-0 backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:duration-200 open:backdrop:opacity-100 starting:open:backdrop:opacity-0';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row, typically a ghost "Cancel" and a primary confirm Button. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const dialog = useDialog(open, onClose);
  const titleId = useId();
  const descId = useId();

  return (
    <dialog
      {...dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-control bg-card p-0 text-chip-ink shadow-overlay',
        'translate-y-2 open:translate-y-0 starting:open:translate-y-2',
        widths[size],
        fade,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-headline-sm text-navy">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-body-md text-muted">
                {description}
              </p>
            )}
          </div>
          <DialogCloseButton onClick={onClose} className="-mt-2" />
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

export { fade as dialogFade };
