'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DialogCloseButton, dialogFade } from './modal';
import { useDialog } from './use-dialog';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  /** Sticky action row, e.g. "Reset" + "Show 24 cars". */
  footer?: ReactNode;
};

/** Mobile-first sheet that slides up from the bottom (used for filters and sort). */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const dialog = useDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog
      {...dialog}
      aria-labelledby={titleId}
      className={cn(
        'mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-full flex-col rounded-t-card bg-card p-0 text-chip-ink shadow-overlay open:flex md:max-w-xl',
        'translate-y-full open:translate-y-0 starting:open:translate-y-full',
        dialogFade,
      )}
    >
      <div className="flex justify-center pt-2" aria-hidden>
        <span className="h-1 w-10 rounded-full bg-input" />
      </div>
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-2">
        <h2 id={titleId} className="text-headline-sm text-navy">
          {title}
        </h2>
        <DialogCloseButton onClick={onClose} />
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
      {footer && (
        <footer className="flex gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:flex-1">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
