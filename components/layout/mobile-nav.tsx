'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { buttonStyles } from '@/components/ui';
import { Drawer } from '@/components/ui/drawer';
import { MenuIcon } from '@/components/ui/icons';
import { PUBLIC_NAV as NAV } from './public-nav';

export function MobileNav({ brand, whatsapp }: { brand: ReactNode; whatsapp: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close after navigating.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-control focus-ring hover:bg-white/10 md:hidden"
      >
        <MenuIcon width={22} height={22} />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu" header={brand} className="bg-navy text-white">
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1 px-2 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                  className="flex min-h-12 items-center rounded-control px-3 text-body-lg font-semibold text-white/85 focus-ring hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {whatsapp && (
          <div className="px-4 pt-4">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className={buttonStyles({ variant: 'whatsapp', fullWidth: true })}
            >
              Chat on WhatsApp
            </a>
          </div>
        )}
      </Drawer>
    </>
  );
}
