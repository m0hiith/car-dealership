'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button, Textarea } from '@/components/ui';
import { TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { addLeadNote, deleteLeadNote } from '@/lib/actions/admin-leads';
import { formatRelativeDateTime } from '@/lib/format';
import type { LeadNote } from '@/lib/queries/admin-leads';
import { LEAD_NOTE_MAX } from '@/lib/validation/admin-leads';

/** Internal notes, oldest first, with a box to add one. Staff only; never shown to the customer. */
export function LeadNotes({ leadId, notes, now }: { leadId: string; notes: LeadNote[]; now: number }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startDeleting] = useTransition();
  const boxId = `note-${leadId}`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return setError('Write a note first.');
    startSaving(async () => {
      const result = await addLeadNote({ leadId, body });
      if (!result.ok) return setError(result.error);
      setDraft('');
      setError(undefined);
    });
  }

  function remove(id: string) {
    if (!window.confirm('Delete this note?')) return;
    setDeleting(id);
    startDeleting(async () => {
      const result = await deleteLeadNote(id);
      setDeleting(null);
      if (!result.ok) toast({ tone: 'error', title: 'Note not deleted', description: result.error });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.length > 0 && (
        <ol className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="group flex gap-2 rounded-control bg-canvas px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-body-md whitespace-pre-line text-chip-ink">{note.body}</p>
                <p className="text-body-sm text-muted">
                  {formatRelativeDateTime(note.createdAt, now)}
                  {note.authorEmail && ` · ${note.authorEmail}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(note.id)}
                disabled={deleting === note.id}
                aria-label="Delete note"
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted focus-ring hover:bg-chip hover:text-danger disabled:opacity-50"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <Textarea
          id={boxId}
          label="Add a note"
          hideLabel
          rows={2}
          maxLength={LEAD_NOTE_MAX}
          placeholder="Add a note, e.g. Called, coming for a test drive on Saturday"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(undefined);
          }}
          error={error}
          className="min-h-16"
        />
        <Button type="submit" variant="ghost" size="sm" loading={saving} disabled={!draft.trim()} className="self-end">
          Save note
        </Button>
      </form>
    </div>
  );
}
