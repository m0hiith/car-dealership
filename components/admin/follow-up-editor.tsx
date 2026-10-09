'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Alert, Button, Input } from '@/components/ui';
import { CheckIcon, ClockIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { completeFollowUp, saveFollowUp } from '@/lib/actions/follow-ups';
import { cn } from '@/lib/cn';
import { followUpState, formatFollowUp, inDays, toKolkataInputValue, type FollowUpKind } from '@/lib/follow-up';

const QUICK = [
  { days: 1, label: '+1 day' },
  { days: 2, label: '+2 days' },
  { days: 7, label: '+1 week' },
] as const;

/**
 * Set, reschedule or complete the next follow-up on a lead or sell request.
 * Quick buttons fill the time from now; nothing is saved until Save.
 */
export function FollowUpEditor({
  kind,
  id,
  at,
  note,
  now,
}: {
  kind: FollowUpKind;
  id: string;
  /** Saved follow-up time (ISO), or null. */
  at: string | null;
  note: string | null;
  now: number;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(() => toKolkataInputValue(at));
  const [text, setText] = useState(note ?? '');
  const [errors, setErrors] = useState<{ at?: string; note?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const state = at ? followUpState(at, now) : null;
  const changed = value !== toKolkataInputValue(at) || text !== (note ?? '');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    startTransition(async () => {
      try {
        const result = await saveFollowUp({ kind, id, at: value, note: text });
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setFormError(result.error);
          return;
        }
        setErrors({});
        toast({ tone: 'success', title: at ? 'Follow-up rescheduled' : 'Follow-up set' });
      } catch {
        setFormError('Could not save. Check your connection and try again.');
      }
    });
  }

  function markDone() {
    setFormError(undefined);
    startTransition(async () => {
      try {
        const result = await completeFollowUp({ kind, id });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        setValue('');
        setText('');
        toast({ tone: 'success', title: 'Follow-up done', description: 'Recorded in the notes.' });
      } catch {
        setFormError('Could not update. Check your connection and try again.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {at && state && (
        <p
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-control px-3 py-2 text-label-lg',
            state === 'overdue' ? 'bg-danger-soft text-danger' : 'bg-action-soft text-action-ink',
          )}
        >
          <ClockIcon width={16} height={16} aria-hidden />
          {state === 'overdue' ? 'Overdue: ' : 'Due '}
          {formatFollowUp(at, now)}
          {note && <span className="font-normal text-chip-ink">· {note}</span>}
        </p>
      )}
      {formError && <Alert>{formError}</Alert>}
      <div className="flex flex-col gap-2">
        <Input
          type="datetime-local"
          label={at ? 'Reschedule to' : 'Follow up on'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.at}
          hint="Hyderabad time. Due follow-ups are in the 8 AM reminder email and on the dashboard."
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick follow-up times">
          {QUICK.map((q) => (
            <Button key={q.days} variant="ghost" size="sm" onClick={() => setValue(inDays(Date.now(), q.days))}>
              {q.label}
            </Button>
          ))}
        </div>
      </div>
      <Input
        label="Note (optional)"
        maxLength={500}
        autoComplete="off"
        placeholder="e.g. Share more photos, call after 6 PM"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={errors.note}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!value || !changed}>
          {at ? 'Save new time' : 'Set follow-up'}
        </Button>
        {at && (
          <Button variant="ghost" size="sm" onClick={markDone} disabled={pending}>
            <CheckIcon width={16} height={16} />
            Mark done
          </Button>
        )}
      </div>
    </form>
  );
}
