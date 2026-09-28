'use client';

import { useOptimistic, useTransition } from 'react';
import { Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { setLeadStatus } from '@/lib/actions/admin-leads';
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from '@/lib/lead-status';

const OPTIONS = LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }));

/** Inline status change. Shows the new status straight away and puts it back if saving fails. */
export function LeadStatusSelect({
  leadId,
  leadName,
  status,
}: {
  leadId: string;
  leadName: string;
  status: LeadStatus;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(status);

  return (
    <Select
      label={`Status of ${leadName}'s enquiry`}
      hideLabel
      options={OPTIONS}
      value={shown}
      aria-busy={pending || undefined}
      className="h-9 w-40 text-body-md"
      onChange={(e) => {
        const to = e.target.value as LeadStatus;
        startTransition(async () => {
          setShown(to);
          const result = await setLeadStatus({ id: leadId, to });
          if (!result.ok) toast({ tone: 'error', title: 'Status not changed', description: result.error });
        });
      }}
    />
  );
}
