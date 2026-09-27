'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { MenuIcon } from '@/components/ui/icons';

/** Top bar with a menu button that opens the admin navigation in a drawer. Hidden on desktop. */
export function AdminMobileNav({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Close once a link is followed or Logout is pressed.
  function closeOnSelect(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('a, button[type="submit"]')) setOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-navy-dark px-2 text-white lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex size-10 items-center justify-center rounded-control focus-ring hover:bg-white/10"
      >
        <MenuIcon width={22} height={22} />
      </button>
      <div className="min-w-0 flex-1">{brand}</div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Admin menu" header={brand} className="bg-navy-dark text-white">
        <div onClick={closeOnSelect} className="flex min-h-full flex-col pt-2">
          {children}
        </div>
      </Drawer>
    </header>
  );
}
