'use client';

import { Button } from '@/components/ui';

/** Sticky bottom bar for single-record admin forms (content, settings). */
export function FormSaveBar({
  dirty,
  saving,
  busyNote,
  label = 'Save changes',
}: {
  dirty: boolean;
  saving: boolean;
  /** Shown instead of the saved state while something is uploading. */
  busyNote?: string | null;
  label?: string;
}) {
  const note = busyNote ?? (dirty ? 'Unsaved changes' : 'All changes saved');
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-overlay md:-mx-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-body-sm text-muted" aria-live="polite">
          {note}
        </span>
        <Button type="submit" loading={saving} disabled={saving || Boolean(busyNote)}>
          {label}
        </Button>
      </div>
    </div>
  );
}

/** DOM id for a field keyed by its dotted error path ("whyUs.2.title"). */
export function fieldDomId(key: string) {
  return `field-${key.replace(/\./g, '-')}`;
}

/** Scrolls to and focuses the first field with an error, in the order given. */
export function focusFirstError(order: string[], errors: Record<string, string>) {
  const first = order.find((key) => errors[key]) ?? Object.keys(errors)[0];
  if (!first) return;
  const el = document.getElementById(fieldDomId(first));
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.focus({ preventScroll: true });
}
