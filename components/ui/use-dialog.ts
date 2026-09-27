'use client';

import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react';

/**
 * Drives a native <dialog> from React state. showModal() gives us focus
 * trapping, Escape-to-close, an inert background and focus restoration.
 */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Lock page scroll while open (showModal does not do this).
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const dialogProps = {
    ref,
    // Escape key: let React state own the close.
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    // Clicks on the ::backdrop land on the dialog element itself.
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
  };

  return dialogProps;
}
