'use client';

import { fieldDomId } from '@/components/admin/form-save-bar';
import { Button, Input, Textarea } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { MAX_WHY_US_ITEMS, type FieldErrors, type WhyUsItem } from '@/lib/validation/content';

export type WhyUsRow = WhyUsItem & { key: string };

/** Add, edit, remove and reorder the Why Choose Us items. Up/down buttons work the same on phones and with a keyboard. */
export function WhyUsEditor({
  rows,
  onChange,
  errors,
}: {
  rows: WhyUsRow[];
  onChange: (rows: WhyUsRow[]) => void;
  errors: FieldErrors;
}) {
  function update(index: number, patch: Partial<WhyUsItem>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, by: -1 | 1) {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + by, 0, row!);
    onChange(next);
    // Keep focus on the moved item: the same button, or the other one once it reaches the end.
    requestAnimationFrame(() => {
      const [same, other] = by < 0 ? ['up', 'down'] : ['down', 'up'];
      const button = document.getElementById(`why-us-${row!.key}-${same}`) as HTMLButtonElement | null;
      if (button && !button.disabled) button.focus();
      else document.getElementById(`why-us-${row!.key}-${other}`)?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 && <p className="text-body-md text-muted">No items. The section is hidden on the website.</p>}
      <ol className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <li key={row.key} className="flex flex-col gap-3 rounded-control border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-md text-muted uppercase">Item {i + 1}</span>
              <div className="flex gap-1">
                <Button
                  id={`why-us-${row.key}-up`}
                  variant="ghost"
                  size="sm"
                  aria-label={`Move item ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  id={`why-us-${row.key}-down`}
                  variant="ghost"
                  size="sm"
                  aria-label={`Move item ${i + 1} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>
            <Input
              id={fieldDomId(`whyUs.${i}.title`)}
              label="Heading"
              required
              maxLength={60}
              value={row.title}
              onChange={(e) => update(i, { title: e.target.value })}
              error={errors[`whyUs.${i}.title`]}
            />
            <Textarea
              id={fieldDomId(`whyUs.${i}.description`)}
              label="Text"
              rows={2}
              maxLength={200}
              value={row.description}
              onChange={(e) => update(i, { description: e.target.value })}
              error={errors[`whyUs.${i}.description`]}
            />
          </li>
        ))}
      </ol>
      {errors.whyUs && <p className="text-body-sm font-medium text-danger">{errors.whyUs}</p>}
      <Button
        variant="ghost"
        className="self-start"
        disabled={rows.length >= MAX_WHY_US_ITEMS}
        onClick={() => onChange([...rows, { key: crypto.randomUUID(), title: '', description: '' }])}
      >
        <PlusIcon width={18} height={18} />
        Add item
      </Button>
      {rows.length >= MAX_WHY_US_ITEMS && (
        <p className="text-body-sm text-muted">You can have up to {MAX_WHY_US_ITEMS} items.</p>
      )}
    </div>
  );
}
