'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, buttonStyles, Input, Select, Textarea } from '@/components/ui';
import { Honeypot } from '@/components/ui/honeypot';
import { CheckIcon, ChevronDownIcon, QuoteIcon } from '@/components/ui/icons';
import { submitLead, type LeadFormState } from '@/lib/actions/leads';
import { BODY_TYPE_LABELS, BODY_TYPES } from '@/lib/car-options';
import { CALL_WHEN, CALL_WHEN_KEYS, kolkataDateValue, MAX_PICK_DAYS } from '@/lib/follow-up';
import {
  BUDGET_RANGE_KEYS,
  BUDGET_RANGES,
  BUYING_TIMELINE_KEYS,
  BUYING_TIMELINES,
  EXCHANGE_OPTIONS,
} from '@/lib/lead-profile';
import { PREFERRED_TIMES } from '@/lib/validation/lead';

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
const CALL_WHEN_OPTIONS = CALL_WHEN_KEYS.map((k) => ({ value: k, label: CALL_WHEN[k] }));
const BUDGET_OPTIONS = BUDGET_RANGE_KEYS.map((k) => ({ value: k, label: BUDGET_RANGES[k] }));
const BODY_OPTIONS = BODY_TYPES.map((t) => ({ value: t, label: BODY_TYPE_LABELS[t] }));
const TIMELINE_OPTIONS = BUYING_TIMELINE_KEYS.map((k) => ({ value: k, label: BUYING_TIMELINES[k] }));
const EXCHANGE_SELECT = (['yes', 'no'] as const).map((k) => ({ value: k, label: EXCHANGE_OPTIONS[k] }));
const PROFILE_FIELDS = ['city', 'budgetRange', 'bodyType', 'timeline', 'exchange'] as const;

export function LeadForm({ carSlug, defaultMessage, whatsappHref, idPrefix = 'lead' }: LeadFormProps) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLead, { status: 'idle' });
  // null until the visitor touches the field; then their choice wins over what a failed submit sent back.
  const [callWhen, setCallWhen] = useState<string | null>(null);
  // Date limits for "Pick a date", in Kolkata; fixed for the life of the form.
  const [dateRange] = useState(() => ({
    min: kolkataDateValue(Date.now()),
    max: kolkataDateValue(Date.now(), MAX_PICK_DAYS),
  }));

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
            <a href={whatsappHref} target="_blank" rel="noopener" className={buttonStyles({ variant: 'whatsapp' })}>
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
      <Honeypot id={`${idPrefix}-hp`} />

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
          id={`${idPrefix}-call-when`}
          label="When should we call you? (optional)"
          name="callWhen"
          placeholder="Whenever suits you"
          options={CALL_WHEN_OPTIONS}
          defaultValue={values?.callWhen ?? ''}
          onChange={(e) => setCallWhen(e.target.value)}
          error={errors?.callWhen}
        />
        {(callWhen ?? values?.callWhen) === 'pick' && (
          <Input
            id={`${idPrefix}-call-date`}
            label="Date"
            name="callDate"
            type="date"
            required
            min={dateRange.min}
            max={dateRange.max}
            defaultValue={values?.callDate}
            error={errors?.callDate}
          />
        )}
        <Select
          id={`${idPrefix}-time`}
          label="Best time to call (optional)"
          name="preferredTime"
          placeholder="No preference"
          options={TIME_OPTIONS}
          defaultValue={values?.preferredTime ?? ''}
          error={errors?.preferredTime}
        />
        {/* Optional profile: folded away so the form stays short. Opens itself if the visitor filled it or it has an error. */}
        <details
          className="group rounded-control border border-border"
          open={PROFILE_FIELDS.some((f) => values?.[f] || errors?.[f]) || undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-label-lg text-navy focus-ring [&::-webkit-details-marker]:hidden">
            Tell us what you&apos;re looking for (optional)
            <ChevronDownIcon width={18} height={18} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-3 pb-4 sm:grid-cols-2">
            <Input
              id={`${idPrefix}-city`}
              label="Your city"
              name="city"
              autoComplete="address-level2"
              maxLength={60}
              defaultValue={values?.city}
              error={errors?.city}
            />
            <Select
              id={`${idPrefix}-budget`}
              label="Budget"
              name="budgetRange"
              placeholder="Not sure yet"
              options={BUDGET_OPTIONS}
              defaultValue={values?.budgetRange ?? ''}
              error={errors?.budgetRange}
            />
            <Select
              id={`${idPrefix}-body`}
              label="Type of car"
              name="bodyType"
              placeholder="Any"
              options={BODY_OPTIONS}
              defaultValue={values?.bodyType ?? ''}
              error={errors?.bodyType}
            />
            <Select
              id={`${idPrefix}-timeline`}
              label="When are you planning to buy?"
              name="timeline"
              placeholder="Not sure yet"
              options={TIMELINE_OPTIONS}
              defaultValue={values?.timeline ?? ''}
              error={errors?.timeline}
            />
            <Select
              id={`${idPrefix}-exchange`}
              label="Do you have a car to exchange?"
              name="exchange"
              placeholder="Not sure"
              options={EXCHANGE_SELECT}
              defaultValue={values?.exchange ?? ''}
              error={errors?.exchange}
            />
          </div>
        </details>
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
