'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DialogCloseButton, dialogFade } from './modal';
import { useDialog } from './use-dialog';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name; shown in the header unless `header` replaces it. */
  title: string;
  header?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Full-height panel that slides in from the left (mobile navigation). */
export function Drawer({ open, onClose, title, header, children, className }: DrawerProps) {
  const dialog = useDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog
      {...dialog}
      aria-labelledby={titleId}
      className={cn(
        'my-0 mr-auto ml-0 h-dvh max-h-dvh w-72 max-w-[85vw] flex-col p-0 shadow-overlay open:flex',
        '-translate-x-full open:translate-x-0 starting:open:-translate-x-full',
        dialogFade,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={header ? 'sr-only' : 'text-headline-sm'}>
            {title}
          </h2>
          {header}
        </div>
        <DialogCloseButton onClick={onClose} className="text-current hover:bg-current/10 hover:text-current" />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
