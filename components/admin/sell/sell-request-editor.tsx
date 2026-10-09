'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { updateSellRequest, type SellRequestActionResult } from '@/lib/actions/admin-sell';
import { SELL_REQUEST_STATUS_LABELS, SELL_REQUEST_STATUSES, type SellRequestStatus } from '@/lib/sell-status';

const OPTIONS = SELL_REQUEST_STATUSES.map((s) => ({ value: s, label: SELL_REQUEST_STATUS_LABELS[s] }));

type FieldErrors = Extract<SellRequestActionResult, { ok: false }>['fieldErrors'];

/** Status and internal notes, saved together. Notes are never shown to the customer. */
export function SellRequestEditor({
  id,
  status: initialStatus,
  notes: initialNotes,
}: {
  id: string;
  status: SellRequestStatus;
  notes: string | null;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError(undefined);
    try {
      const result = await updateSellRequest({ id, status, notes });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      setErrors({});
      toast({ tone: 'success', title: 'Saved', description: SELL_REQUEST_STATUS_LABELS[status] });
    } catch {
      setFormError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      <Select
        label="Status"
        options={OPTIONS}
        value={status}
        onChange={(e) => setStatus(e.target.value as SellRequestStatus)}
        error={errors?.status}
      />
      <Textarea
        label="Internal notes"
        rows={6}
        maxLength={5000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={errors?.notes}
        hint="Only staff see these. Calls made, inspection findings, offers…"
      />
      <Button type="submit" loading={saving} className="self-start">
        Save
      </Button>
    </form>
  );
}
