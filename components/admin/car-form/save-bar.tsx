'use client';

import { useState } from 'react';
import { CarStatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { MoreIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import type { CarStatus } from '@/lib/car-options';
import { MORE_STATUS_ACTIONS, type StatusAction } from '@/components/admin/car-status-actions';

export type SaveBarProps = {
  /** Saved status, or null for a car that has not been saved yet. */
  status: CarStatus | null;
  dirty: boolean;
  /** The status being saved right now, if any. */
  pendingTo: CarStatus | null;
  uploading: number;
  onSave: (to: CarStatus) => void | Promise<void>;
};

/** Sticky bottom bar: status, unsaved/uploading state and the save actions. */
export function SaveBar({ status, dirty, pendingTo, uploading, onSave }: SaveBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState<StatusAction | null>(null);
  const busy = pendingTo !== null;
  const isDraft = status === null || status === 'draft';
  const more = status ? MORE_STATUS_ACTIONS[status] : [];

  function run(action: StatusAction) {
    setSheetOpen(false);
    if (action.confirm) setConfirming(action);
    else void onSave(action.to);
  }

  let note = 'All changes saved';
  if (uploading > 0) note = `Uploading ${uploading} photo${uploading === 1 ? '' : 's'}…`;
  else if (dirty) note = 'Unsaved changes';
  else if (status === null) note = 'Not saved yet';

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-overlay md:-mx-8 md:px-8">
      <div className="flex items-center gap-3">
        <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
          {status && <CarStatusBadge status={status} />}
          <span className="truncate text-body-sm text-muted" aria-live="polite">
            {note}
          </span>
        </div>
        <div className="flex flex-1 gap-2 sm:flex-none">
          {isDraft ? (
            <>
              <Button
                variant="ghost"
                onClick={() => void onSave('draft')}
                loading={pendingTo === 'draft'}
                disabled={busy}
                className="flex-1 sm:flex-none"
              >
                Save draft
              </Button>
              <Button
                onClick={() => void onSave('published')}
                loading={pendingTo === 'published'}
                disabled={busy}
                className="flex-1 sm:flex-none"
              >
                Publish
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setSheetOpen(true)}
                disabled={busy}
                className="flex-1 sm:flex-none"
              >
                <MoreIcon width={18} height={18} />
                Status
              </Button>
              <Button
                onClick={() => status && void onSave(status)}
                loading={pendingTo !== null}
                disabled={busy}
                className="flex-1 sm:flex-none"
              >
                Save changes
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-body-sm text-muted sm:hidden" aria-hidden>
        {status && <span className="font-semibold text-chip-ink">{statusWord(status)} · </span>}
        {note}
      </p>

      {status && more.length > 0 && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Change status">
          <p className="mb-3 text-body-md text-muted">Any edits you have made on this page are saved too.</p>
          <ul className="flex flex-col gap-2">
            {more.map((action) => (
              <li key={action.to}>
                <button
                  type="button"
                  onClick={() => run(action)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-control border border-border px-4 py-3 text-left focus-ring transition-colors hover:border-tint hover:bg-canvas"
                >
                  <span className="text-label-lg text-navy">{action.label}</span>
                  <span className="text-body-sm text-muted">{action.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming?.confirm?.title ?? ''}
        description={confirming?.confirm?.body}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirming) void onSave(confirming.to);
                setConfirming(null);
              }}
            >
              {confirming?.confirm?.button}
            </Button>
          </>
        }
      />
    </div>
  );
}

function statusWord(status: CarStatus) {
  return { draft: 'Draft', published: 'Published', reserved: 'Reserved', sold: 'Sold', archived: 'Archived' }[status];
}
