'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Modal } from '@/components/ui/modal';
import { LeadForm, type LeadFormProps } from './lead-form';

const EnquiryContext = createContext<(() => void) | null>(null);

const TABLET_UP = '(min-width: 768px)';

function useIsTabletUp() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(TABLET_UP);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(TABLET_UP).matches,
    () => false,
  );
}

/**
 * One enquiry form per page, opened by any EnquireButton inside: a dialog
 * on tablet and desktop, a bottom sheet on phones.
 */
export function EnquiryProvider({
  title,
  description,
  form,
  children,
}: {
  title: string;
  description?: string;
  form: LeadFormProps;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tabletUp = useIsTabletUp();
  const close = () => setOpen(false);
  const body = <LeadForm {...form} idPrefix="enquiry" />;

  return (
    <EnquiryContext value={() => setOpen(true)}>
      {children}
      {tabletUp ? (
        <Modal open={open} onClose={close} title={title} description={description}>
          {body}
        </Modal>
      ) : (
        <BottomSheet open={open} onClose={close} title={title}>
          {description && <p className="mb-4 text-body-md text-muted">{description}</p>}
          {body}
        </BottomSheet>
      )}
    </EnquiryContext>
  );
}

export function EnquireButton({ onClick, ...props }: Omit<ButtonProps, 'type'>) {
  const open = useContext(EnquiryContext);
  if (!open) throw new Error('EnquireButton must be inside <EnquiryProvider>');
  return (
    <Button
      aria-haspopup="dialog"
      onClick={(e) => {
        onClick?.(e);
        open();
      }}
      {...props}
    />
  );
}
