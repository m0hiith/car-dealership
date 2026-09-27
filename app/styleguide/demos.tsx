'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { ToastProvider, useToast } from '@/components/ui/toast';

export function LoadingButtonDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      loading={loading}
      onClick={() => {
        setLoading(true);
        window.setTimeout(() => setLoading(false), 2000);
      }}
    >
      {loading ? 'Saving…' : 'Click to load'}
    </Button>
  );
}

const fuels = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

export function ChipDemo() {
  const [selected, setSelected] = useState<string[]>(['Petrol']);
  const [active, setActive] = useState(['BMW', 'Automatic', 'Under ₹20 Lakh']);
  const toggle = (f: string) => setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-label-md text-muted">Toggle (filter options)</p>
        <div className="flex flex-wrap gap-2">
          {fuels.map((f) => (
            <Chip key={f} selected={selected.includes(f)} onClick={() => toggle(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-label-md text-muted">Removable (active filters)</p>
        <div className="flex flex-wrap gap-2">
          {active.map((a) => (
            <Chip key={a} onRemove={() => setActive((s) => s.filter((x) => x !== a))}>
              {a}
            </Chip>
          ))}
          {active.length === 0 && (
            <Button size="sm" variant="ghost" onClick={() => setActive(['BMW', 'Automatic', 'Under ₹20 Lakh'])}>
              Reset demo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this draft?"
        description="Drafts can be deleted permanently. Published and sold cars can only be archived."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete draft
            </Button>
          </>
        }
      />
    </>
  );
}

export function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Open filter sheet
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <>
            <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
              Reset
            </Button>
            <Button fullWidth onClick={() => setOpen(false)}>
              Show 24 cars
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <Select
            label="Sort by"
            defaultValue="newest"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'price-asc', label: 'Price: low to high' },
              { value: 'price-desc', label: 'Price: high to low' },
              { value: 'km-asc', label: 'Kilometres: low to high' },
            ]}
          />
          <fieldset>
            <legend className="mb-1 text-label-lg text-navy">Fuel type</legend>
            {fuels.map((f, i) => (
              <Checkbox key={f} label={f} meta={[12, 7, 3, 1, 1][i]} defaultChecked={f === 'Petrol'} />
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-label-lg text-navy">Transmission</legend>
            <Checkbox label="Manual" meta={9} />
            <Checkbox label="Automatic" meta={15} />
          </fieldset>
        </div>
      </BottomSheet>
    </>
  );
}

function ToastButtons() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="ghost"
        onClick={() =>
          toast({ tone: 'success', title: 'Enquiry sent', description: 'The dealership will call you back shortly.' })
        }
      >
        Success toast
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({ tone: 'error', title: 'Could not save', description: 'Check your connection and retry.' })
        }
      >
        Error toast
      </Button>
      <Button variant="ghost" onClick={() => toast({ title: 'Car moved to Reserved' })}>
        Info toast
      </Button>
    </div>
  );
}

export function ToastDemo() {
  return (
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>
  );
}
