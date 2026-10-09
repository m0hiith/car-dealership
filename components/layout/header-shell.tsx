'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Sticky white header bar; gains a soft shadow once the page has scrolled. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border bg-white text-navy transition-shadow duration-200',
        scrolled && 'shadow-level-2',
      )}
    >
      {children}
    </header>
  );
}
