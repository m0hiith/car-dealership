'use client';

import { useActionState } from 'react';
import { Alert, Button, buttonStyles, Input, Select, Textarea } from '@/components/ui';
import { CheckIcon, QuoteIcon } from '@/components/ui/icons';
import { submitLead, type LeadFormState } from '@/lib/actions/leads';
import { HONEYPOT_FIELD, PREFERRED_TIMES } from '@/lib/validation/lead';

export type LeadFormProps = {
  /** Attaches the enquiry to this car. */
  carSlug?: string;
  defaultMessage?: string;
  /** wa.me link offered after a successful enquiry. */
  whatsappHref?: string | null;
  /** Prefix for input ids when the form appears more than once on a page. */
  idPrefix?: string;
};

const TIME_OPTIONS = PREFERRED_TIMES.map((t) => ({ value: t, label: t }));

export function LeadForm({ carSlug, defaultMessage, whatsappHref, idPrefix = 'lead' }: LeadFormProps) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLead, { status: 'idle' });

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-trust-soft text-trust" aria-hidden>
          <CheckIcon width={24} height={24} />
        </span>
        <h3 className="text-headline-sm text-navy">
          Thanks{state.name ? `, ${state.name.split(' ')[0]}` : ''}. We&apos;ve got your enquiry.
        </h3>
        <p className="text-body-md text-muted">Our team will call you back soon.</p>
        {whatsappHref && (
          <>
            <p className="text-body-md text-muted">Want a faster reply? Message us on WhatsApp.</p>
            <a href={whatsappHref} target="_blank" rel="noopener" className={buttonStyles({ variant: 'secondary' })}>
              <QuoteIcon width={18} height={18} />
              Continue on WhatsApp
            </a>
          </>
        )}
      </div>
    );
  }

  const failed = state.status === 'error' ? state : null;
  const values = failed?.values;
  const errors = failed?.fieldErrors;
  // Remount the fields after a failed submit so they show what was sent.
  const key = failed ? JSON.stringify(values) : 'initial';

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {failed && <Alert>{failed.error}</Alert>}
      {carSlug && <input type="hidden" name="carSlug" value={carSlug} />}
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${idPrefix}-${HONEYPOT_FIELD}`}>Leave this empty</label>
        <input
          id={`${idPrefix}-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div key={key} className="flex flex-col gap-4">
        <Input
          id={`${idPrefix}-name`}
          label="Name"
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          defaultValue={values?.name}
          error={errors?.name}
        />
        <Input
          id={`${idPrefix}-phone`}
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          required
          maxLength={16}
          defaultValue={values?.phone}
          error={errors?.phone}
        />
        <Input
          id={`${idPrefix}-email`}
          label="Email (optional)"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          defaultValue={values?.email}
          error={errors?.email}
        />
        <Select
          id={`${idPrefix}-time`}
          label="Best time to call (optional)"
          name="preferredTime"
          placeholder="No preference"
          options={TIME_OPTIONS}
          defaultValue={values?.preferredTime ?? ''}
          error={errors?.preferredTime}
        />
        <Textarea
          id={`${idPrefix}-message`}
          label="Message"
          name="message"
          rows={3}
          maxLength={2000}
          defaultValue={values?.message ?? defaultMessage}
          error={errors?.message}
        />
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Send enquiry
      </Button>
    </form>
  );
}
