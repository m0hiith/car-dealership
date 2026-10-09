'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, buttonStyles, Card, Input, Select, Textarea } from '@/components/ui';
import { Honeypot } from '@/components/ui/honeypot';
import { CheckIcon, WhatsAppIcon } from '@/components/ui/icons';
import { submitSellRequest } from '@/lib/actions/sell';
import {
  FUEL_LABELS,
  FUEL_TYPES,
  MIN_CAR_YEAR,
  OWNER_LABELS,
  REGISTRATION_STATES,
  TRANSMISSION_LABELS,
  TRANSMISSIONS,
} from '@/lib/car-options';
import { cn } from '@/lib/cn';
import { whatsappHref } from '@/lib/contact';
import type { SellBrandOption } from '@/lib/queries/sell';
import { HONEYPOT_FIELD, PREFERRED_TIMES } from '@/lib/validation/lead';
import {
  OTHER,
  SELL_STEPS,
  sellFieldErrors,
  sellRequestSchema,
  type SellField,
  type SellRequestInput,
} from '@/lib/validation/sell';
import { SellPhotos, type SellPhoto } from './sell-photos';

type Values = Omit<SellRequestInput, 'photoPaths'>;
type Errors = Partial<Record<SellField, string>>;

const INITIAL: Values = {
  brandId: '',
  brandOther: '',
  modelId: '',
  modelOther: '',
  variant: '',
  year: '',
  kmsDriven: '',
  fuelType: '' as Values['fuelType'],
  transmission: '' as Values['transmission'],
  owners: '1',
  registrationState: 'TS',
  registrationCity: 'Hyderabad',
  expectedPrice: '',
  conditionNotes: '',
  name: '',
  phone: '',
  preferredTime: '',
};

const STEP_OF = Object.fromEntries(SELL_STEPS.flatMap((step, i) => step.fields.map((f) => [f, i]))) as Record<
  SellField,
  number
>;

const fieldId = (field: SellField) => `sell-${field}`;

/** Five short steps; each is checked before moving on, and everything again on the server. */
export function SellForm({ brands, whatsappNumber }: { brands: SellBrandOption[]; whatsappNumber: string | null }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(INITIAL);
  const [photos, setPhotos] = useState<SellPhoto[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ name: string; car: string } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const brand = brands.find((b) => b.id === values.brandId);
  const uploading = photos.some((p) => p.status === 'working');
  const failedPhotos = photos.some((p) => p.status === 'error');

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - MIN_CAR_YEAR + 1 }, (_, i) => String(now - i));
  }, []);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function input(): SellRequestInput {
    return {
      ...values,
      photoPaths: photos.flatMap((p) => (p.status === 'done' ? [p.path] : [])),
    };
  }

  function goTo(next: number) {
    setStep(next);
    setFormError(undefined);
    // Move focus to the new step's heading so screen readers announce it.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  /** Errors that belong to the given step, from validating everything. */
  function stepErrors(index: number): Errors {
    const check = sellRequestSchema.safeParse(input());
    if (check.success) return {};
    const all = sellFieldErrors(check.error);
    return Object.fromEntries(Object.entries(all).filter(([field]) => STEP_OF[field as SellField] === index)) as Errors;
  }

  function next() {
    if (step === 3 && uploading) {
      setFormError('Wait for your photos to finish uploading.');
      return;
    }
    if (step === 3 && failedPhotos) {
      setFormError('Remove or retry the photos that did not upload.');
      return;
    }
    const found = stepErrors(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Please check the highlighted fields.');
      const first = SELL_STEPS[step]!.fields.find((f) => found[f]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    goTo(step + 1);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < SELL_STEPS.length - 1) {
      next();
      return;
    }
    const check = sellRequestSchema.safeParse(input());
    if (!check.success) {
      const all = sellFieldErrors(check.error);
      setErrors(all);
      const firstStep = Math.min(...Object.keys(all).map((f) => STEP_OF[f as SellField]));
      if (firstStep !== step) goTo(firstStep);
      setFormError('Please check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      const result = await submitSellRequest({ ...input(), [HONEYPOT_FIELD]: honeypot.current?.value ?? '' });
      if (result.ok) {
        setDone({ name: result.name, car: result.car });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setFormError(result.error);
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        const steps = Object.keys(result.fieldErrors).map((f) => STEP_OF[f as SellField]);
        if (steps.length) goTo(Math.min(...steps));
      }
    } catch {
      setFormError('Could not send your request. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const whatsapp = whatsappHref(
      whatsappNumber,
      `Hi, I just sent a request on your website to sell my ${done.car}. My name is ${done.name}.`,
    );
    return (
      <Card padding="lg" className="flex flex-col items-start gap-4" role="status">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-trust-soft text-trust-ink"
          aria-hidden
        >
          <CheckIcon width={24} height={24} />
        </span>
        <h2 className="text-headline-md text-navy">Thanks{done.name ? `, ${done.name}` : ''}. We have your details.</h2>
        <p className="text-body-lg text-muted">
          Our team will call you about your {done.car || 'car'}. If you would like to talk sooner, message us on
          WhatsApp.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: 'whatsapp' })}
            >
              <WhatsAppIcon width={18} height={18} />
              Chat on WhatsApp
            </a>
          )}
          <Link href="/cars" className={buttonStyles({ variant: 'ghost' })}>
            Browse our cars
          </Link>
        </div>
      </Card>
    );
  }

  const current = SELL_STEPS[step]!;
  const brandOptions = [
    ...brands.map((b) => ({ value: b.id, label: b.name })),
    { value: OTHER, label: 'Other (not listed)' },
  ];
  const modelOptions = [
    ...(brand?.models.map((m) => ({ value: m.id, label: m.name })) ?? []),
    { value: OTHER, label: 'Other (not listed)' },
  ];

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:p-6">
        <p className="text-label-md text-muted uppercase">
          Step {step + 1} of {SELL_STEPS.length}
        </p>
        <ol className="flex gap-1.5" aria-hidden>
          {SELL_STEPS.map((s, i) => (
            <li key={s.title} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-action' : 'bg-chip')} />
          ))}
        </ol>
        <h2 ref={headingRef} tabIndex={-1} className="text-headline-md text-navy outline-none">
          {current.title}
        </h2>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-4 md:p-6">
        {formError && <Alert>{formError}</Alert>}

        <Honeypot id="sell-hp" inputRef={honeypot} />

        {step === 0 && (
          <>
            <Select
              id={fieldId('brandId')}
              label="Brand"
              required
              placeholder="Choose brand"
              options={brandOptions}
              value={values.brandId}
              onChange={(e) => {
                set('brandId', e.target.value as Values['brandId']);
                set('modelId', '');
              }}
              error={errors.brandId}
            />
            {values.brandId === OTHER && (
              <Input
                id={fieldId('brandOther')}
                label="Brand name"
                required
                maxLength={60}
                autoComplete="off"
                value={values.brandOther}
                onChange={(e) => set('brandOther', e.target.value)}
                error={errors.brandOther}
              />
            )}
            {values.brandId && values.brandId !== OTHER && (
              <Select
                id={fieldId('modelId')}
                label="Model"
                required
                placeholder="Choose model"
                options={modelOptions}
                value={values.modelId}
                onChange={(e) => set('modelId', e.target.value as Values['modelId'])}
                error={errors.modelId}
              />
            )}
            {(values.brandId === OTHER || values.modelId === OTHER) && (
              <Input
                id={fieldId('modelOther')}
                label="Model name"
                required
                maxLength={60}
                autoComplete="off"
                value={values.modelOther}
                onChange={(e) => set('modelOther', e.target.value)}
                error={errors.modelOther}
              />
            )}
            <Input
              id={fieldId('variant')}
              label="Variant (optional)"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. VX CVT"
              value={values.variant}
              onChange={(e) => set('variant', e.target.value)}
              error={errors.variant}
            />
          </>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              id={fieldId('year')}
              label="Year"
              required
              placeholder="Choose year"
              options={years.map((y) => ({ value: y, label: y }))}
              value={values.year}
              onChange={(e) => set('year', e.target.value)}
              error={errors.year}
            />
            <Input
              id={fieldId('kmsDriven')}
              label="Kilometres driven"
              required
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              placeholder="e.g. 45000"
              value={values.kmsDriven}
              onChange={(e) => set('kmsDriven', e.target.value)}
              error={errors.kmsDriven}
            />
            <Select
              id={fieldId('fuelType')}
              label="Fuel"
              required
              placeholder="Choose fuel"
              options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_LABELS[f] }))}
              value={values.fuelType}
              onChange={(e) => set('fuelType', e.target.value as Values['fuelType'])}
              error={errors.fuelType}
            />
            <Select
              id={fieldId('transmission')}
              label="Transmission"
              required
              placeholder="Choose transmission"
              options={TRANSMISSIONS.map((t) => ({ value: t, label: TRANSMISSION_LABELS[t] }))}
              value={values.transmission}
              onChange={(e) => set('transmission', e.target.value as Values['transmission'])}
              error={errors.transmission}
            />
            <Select
              id={fieldId('owners')}
              label="Ownership"
              required
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: OWNER_LABELS[n]! }))}
              value={String(values.owners)}
              onChange={(e) => set('owners', e.target.value)}
              error={errors.owners}
            />
          </div>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                id={fieldId('registrationState')}
                label="Registration state"
                placeholder="Choose state"
                options={REGISTRATION_STATES.map((s) => ({ value: s, label: s }))}
                value={values.registrationState}
                onChange={(e) => set('registrationState', e.target.value)}
                error={errors.registrationState}
              />
              <Input
                id={fieldId('registrationCity')}
                label="Registration city"
                maxLength={60}
                autoComplete="address-level2"
                value={values.registrationCity}
                onChange={(e) => set('registrationCity', e.target.value)}
                error={errors.registrationCity}
              />
            </div>
            <Input
              id={fieldId('expectedPrice')}
              label="Expected price in ₹ (optional)"
              inputMode="numeric"
              maxLength={14}
              autoComplete="off"
              placeholder="e.g. 550000"
              value={values.expectedPrice}
              onChange={(e) => set('expectedPrice', e.target.value)}
              error={errors.expectedPrice}
            />
            <Textarea
              id={fieldId('conditionNotes')}
              label="Condition notes (optional)"
              rows={4}
              maxLength={2000}
              placeholder="Service history, scratches or dents, recent repairs, tyres…"
              value={values.conditionNotes}
              onChange={(e) => set('conditionNotes', e.target.value)}
              error={errors.conditionNotes}
            />
          </>
        )}

        {step === 3 && (
          <div id={fieldId('photoPaths')} tabIndex={-1}>
            <SellPhotos photos={photos} setPhotos={setPhotos} error={errors.photoPaths} />
          </div>
        )}

        {step === 4 && (
          <>
            <Input
              id={fieldId('name')}
              label="Your name"
              required
              maxLength={100}
              autoComplete="name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
            <Input
              id={fieldId('phone')}
              label="Mobile number"
              required
              type="tel"
              inputMode="tel"
              maxLength={16}
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
              hint="10-digit Indian mobile number. We only use it to contact you about this car."
            />
            <Select
              id={fieldId('preferredTime')}
              label="Best time to call (optional)"
              placeholder="Any time"
              options={PREFERRED_TIMES.map((t) => ({ value: t, label: t }))}
              value={values.preferredTime}
              onChange={(e) => set('preferredTime', e.target.value as Values['preferredTime'])}
              error={errors.preferredTime}
            />
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={submitting}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < SELL_STEPS.length - 1 ? (
            <Button type="submit" disabled={step === 3 && uploading}>
              {step === 3 && uploading
                ? 'Uploading photos…'
                : step === 3 && photos.length === 0
                  ? 'Skip photos'
                  : 'Next'}
            </Button>
          ) : (
            <Button type="submit" loading={submitting}>
              Send request
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
