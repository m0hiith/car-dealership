'use client';

import { useEffect } from 'react';

const MESSAGE = 'You have unsaved changes. Leave this page without saving?';

/** Marks forms whose own submit should not trigger the warning. */
export const UNSAVED_GUARD_IGNORE = 'data-unsaved-guard-ignore';

/**
 * Warns before leaving with unsaved changes: closing or reloading the tab
 * (the browser's own prompt), following any link on the page (sidebar,
 * breadcrumbs) and submitting another form such as Logout.
 * The browser Back button is not intercepted; the App Router has no API to
 * block it reliably.
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      e.returnValue = '';
    }

    // Capture phase on document runs before Next.js <Link> handles the click.
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
      if (samePage && url.search === window.location.search) return; // in-page anchors
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement | null;
      if (form?.hasAttribute(UNSAVED_GUARD_IGNORE)) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [dirty]);
}
