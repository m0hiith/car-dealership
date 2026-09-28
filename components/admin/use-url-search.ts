'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

/**
 * A search box whose value lives in the URL (?q=). Typing updates the URL
 * after a pause; the server does the searching. When q in the URL changes
 * (back button, a "clear" link) the box follows it, unless this box is what
 * sent it (the user may have typed more while the page was loading).
 */
export function useUrlSearch(urlQ: string | undefined, hrefFor: (q: string | undefined) => string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(urlQ ?? '');
  const [seenQ, setSeenQ] = useState(urlQ);
  const [sentQ, setSentQ] = useState<string | undefined | null>(null);
  if (urlQ !== seenQ) {
    setSeenQ(urlQ);
    if (urlQ === sentQ) setSentQ(null);
    else setQuery(urlQ ?? '');
  }

  useEffect(() => {
    const q = query.trim() || undefined;
    if (q === urlQ) return;
    const timer = window.setTimeout(() => {
      setSentQ(q);
      startTransition(() => router.replace(hrefFor(q), { scroll: false }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, urlQ, hrefFor, router]);

  /** Navigate to another URL (a filter change) inside the same transition, so `pending` covers it. */
  function go(href: string) {
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return { query, setQuery, pending, go };
}
