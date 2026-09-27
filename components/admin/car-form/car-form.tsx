'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ChoiceChips, Input, Select, Switch, Textarea } from '@/components/ui';
import { Combobox } from '@/components/ui/combobox';
import { CheckIcon, Spinner } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { checkCarSlug, createModel, saveCar } from '@/lib/actions/cars';
import {
  BODY_TYPE_LABELS,
  BODY_TYPES,
  COLOUR_SUGGESTIONS,
  DEFAULT_REGISTRATION,
  FUEL_LABELS,
  FUEL_TYPES,
  MIN_CAR_YEAR,
  OWNER_LABELS,
  REGISTRATION_STATES,
  TRANSMISSION_LABELS,
  TRANSMISSIONS,
  type BodyType,
  type CarStatus,
  type FuelType,
  type Transmission,
} from '@/lib/car-options';
import { formatKm, formatPriceFull, formatPriceLakh } from '@/lib/format';
import type { CarForEdit, CarFormOptions, ModelOption } from '@/lib/queries/admin-cars';
import { buildCarSlug, slugify, SLUG_MAX_LENGTH } from '@/lib/slug';
import {
  carFieldErrors,
  carSaveSchema,
  maxCarYear,
  type CarField,
  type CarFieldErrors,
  type CarSaveInput,
} from '@/lib/validation/car';
import { FeaturePicker } from './feature-picker';
import { FormSection } from './form-section';
import { PhotoUploader, savedPhotoItems, type PhotoItem } from './photo-uploader';
import { SaveBar } from './save-bar';
import { UNSAVED_GUARD_IGNORE, useUnsavedChangesWarning } from './use-unsaved-changes-warning';

type Values = {
  brandId: string;
  modelId: string;
  variant: string;
  slug: string;
  slugAuto: boolean;
  /** Digits only; shown with Indian grouping. */
  price: string;
  originalPrice: string;
  year: string;
  kmsDriven: string;
  fuelType: FuelType | '';
  transmission: Transmission | '';
  bodyType: BodyType | '';
  engineCc: string;
  owners: string;
  color: string;
  registrationState: string;
  registrationCity: string;
  description: string;
  featured: boolean;
  features: string[];
};

function initialValues(car: CarForEdit | null): Values {
  if (!car) {
    return {
      brandId: '',
      modelId: '',
      variant: '',
      slug: '',
      slugAuto: true,
      price: '',
      originalPrice: '',
      year: '',
      kmsDriven: '',
      fuelType: '',
      transmission: '',
      bodyType: '',
      engineCc: '',
      owners: '1',
      color: '',
      registrationState: DEFAULT_REGISTRATION.state,
      registrationCity: DEFAULT_REGISTRATION.city,
      description: '',
      featured: false,
      features: [],
    };
  }
  return {
    brandId: car.brandId,
    modelId: car.modelId,
    variant: car.variant ?? '',
    slug: car.slug,
    // A saved car keeps its web address unless staff change it on purpose.
    slugAuto: false,
    price: String(car.price),
    originalPrice: car.originalPrice === null ? '' : String(car.originalPrice),
    year: String(car.year),
    kmsDriven: String(car.kmsDriven),
    fuelType: car.fuelType,
    transmission: car.transmission,
    bodyType: car.bodyType,
    engineCc: car.engineCc === null ? '' : String(car.engineCc),
    owners: String(car.owners),
    color: car.color ?? '',
    registrationState: car.registrationState ?? '',
    registrationCity: car.registrationCity ?? '',
    description: car.description ?? '',
    featured: car.featured,
    features: car.features,
  };
}

const toInt = (digits: string) => (digits === '' ? null : Number(digits));
const digitsOnly = (text: string) => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const grouped = (digits: string) => (digits === '' ? '' : new Intl.NumberFormat('en-IN').format(Number(digits)));

/** Field name -> element id, so errors can scroll to and focus the field. */
const fieldId = (field: CarField) => `car-${field}`;

/** Order errors are focused in: top of the page first. */
const FIELD_ORDER: CarField[] = [
  'brandId',
  'modelId',
  'variant',
  'slug',
  'price',
  'originalPrice',
  'year',
  'kmsDriven',
  'fuelType',
  'transmission',
  'bodyType',
  'engineCc',
  'owners',
  'color',
  'registrationState',
  'registrationCity',
  'features',
  'description',
  'photos',
];

const currentYear = maxCarYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - MIN_CAR_YEAR + 1 }, (_, i) => {
  const y = String(currentYear - i);
  return { value: y, label: y };
});
const OWNER_OPTIONS = Object.entries(OWNER_LABELS).map(([value, label]) => ({ value, label }));
const FUEL_OPTIONS = FUEL_TYPES.map((v) => ({ value: v, label: FUEL_LABELS[v] }));
const TRANSMISSION_OPTIONS = TRANSMISSIONS.map((v) => ({ value: v, label: TRANSMISSION_LABELS[v] }));
const BODY_OPTIONS = BODY_TYPES.map((v) => ({ value: v, label: BODY_TYPE_LABELS[v] }));

export type CarFormProps = {
  /** For a new car, a fresh UUID from the server; photos are uploaded under it before the first save. */
  carId: string;
  car: CarForEdit | null;
  options: CarFormOptions;
};

export function CarForm({ carId: initialCarId, car, options }: CarFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [carId] = useState(initialCarId);
  const [status, setStatus] = useState<CarStatus | null>(car?.status ?? null);
  const [values, setValues] = useState<Values>(() => initialValues(car));
  const [photos, setPhotos] = useState<PhotoItem[]>(() => savedPhotoItems(car?.photos ?? []));
  const [models, setModels] = useState<ModelOption[]>(options.models);
  const [errors, setErrors] = useState<CarFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pendingTo, setPendingTo] = useState<CarStatus | null>(null);
  const [creatingModel, setCreatingModel] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);

  // --- Dirty tracking ------------------------------------------------------
  const snapshot = (v: Values, p: PhotoItem[]) => JSON.stringify([v, p.map((x) => x.path ?? x.key)]);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot(initialValues(car), savedPhotoItems(car?.photos ?? [])),
  );
  const current = snapshot(values, photos);
  const dirty = current !== savedSnapshot;
  const uploading = photos.filter((p) => p.status === 'processing' || p.status === 'uploading').length;
  useUnsavedChangesWarning(dirty);

  // --- Brand / model -------------------------------------------------------
  const brandOptions = useMemo(
    () =>
      options.brands.filter((b) => b.isActive || b.id === values.brandId).map((b) => ({ value: b.id, label: b.name })),
    [options.brands, values.brandId],
  );
  const modelOptions = useMemo(
    () =>
      models
        .filter((m) => m.brandId === values.brandId && (m.isActive || m.id === values.modelId))
        .map((m) => ({ value: m.id, label: m.name })),
    [models, values.brandId, values.modelId],
  );
  const brandName = options.brands.find((b) => b.id === values.brandId)?.name ?? '';
  const modelName = models.find((m) => m.id === values.modelId)?.name ?? '';

  // --- Slug ----------------------------------------------------------------
  const suggestedSlug = buildCarSlug({
    year: toInt(values.year),
    brand: brandName,
    model: modelName,
    variant: values.variant,
    fuelType: values.fuelType || null,
    transmission: values.transmission || null,
  });
  const slug = values.slugAuto ? suggestedSlug : values.slug;
  const [slugCheck, setSlugCheck] = useState<{ slug: string; available: boolean } | null>(null);
  const slugCheckFor = slugCheck?.slug === slug ? slugCheck : null;

  useEffect(() => {
    if (slug.length < 3 || (car && slug === car.slug)) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkCarSlug({ slug, carId });
        if (!cancelled) setSlugCheck({ slug, available: result.available });
      } catch {
        // The save checks again; a failed live check is not worth an error.
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, carId, car]);

  // --- Updates -------------------------------------------------------------
  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    const field = key as CarField;
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function addModel(name: string) {
    if (!values.brandId) return;
    setCreatingModel(true);
    try {
      const result = await createModel({ brandId: values.brandId, name });
      if (!result.ok) {
        setErrors((e) => ({ ...e, modelId: result.error }));
        return;
      }
      const model = result.model;
      setModels((list) => (list.some((m) => m.id === model.id) ? list : [...list, model]));
      set('modelId', model.id);
      toast({ tone: 'success', title: `Added ${model.name} to ${brandName}` });
    } catch {
      setErrors((e) => ({ ...e, modelId: 'Could not add the model. Check your connection and try again.' }));
    } finally {
      setCreatingModel(false);
    }
  }

  // --- Save ----------------------------------------------------------------
  function buildInput(to: CarStatus): CarSaveInput {
    return {
      id: carId,
      status: to,
      brandId: values.brandId,
      modelId: values.modelId,
      variant: values.variant,
      slug,
      slugAuto: values.slugAuto,
      // NaN fails validation with the field's own message.
      price: toInt(values.price) ?? Number.NaN,
      originalPrice: toInt(values.originalPrice),
      year: toInt(values.year) ?? Number.NaN,
      kmsDriven: toInt(values.kmsDriven) ?? Number.NaN,
      fuelType: values.fuelType as FuelType,
      transmission: values.transmission as Transmission,
      bodyType: values.bodyType as BodyType,
      engineCc: toInt(values.engineCc),
      owners: toInt(values.owners) ?? 1,
      color: values.color,
      registrationState: values.registrationState,
      registrationCity: values.registrationCity,
      description: values.description,
      featured: values.featured,
      features: values.features,
      photos: photos.flatMap((p) => (p.status === 'done' && p.path ? [p.path] : [])),
    };
  }

  function showErrors(fieldErrors: CarFieldErrors, message: string) {
    setErrors(fieldErrors);
    setFormError(message);
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    if (first) {
      const el = document.getElementById(fieldId(first));
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    }
  }

  async function save(to: CarStatus) {
    setFormError(undefined);

    if (uploading > 0) {
      setFormError('Please wait for the photos to finish uploading.');
      return;
    }
    if (photos.some((p) => p.status === 'error')) {
      showErrors(
        { photos: 'Some photos failed to upload. Retry or remove them.' },
        'Please fix the highlighted fields.',
      );
      return;
    }

    const input = buildInput(to);
    const check = carSaveSchema.safeParse(input);
    if (!check.success) {
      const fieldErrors = carFieldErrors(check.error);
      const count = Object.keys(fieldErrors).length;
      showErrors(
        fieldErrors,
        count === 1 ? 'Please fix the highlighted field.' : `Please fix the ${count} highlighted fields.`,
      );
      return;
    }

    const before = status;
    setPendingTo(to);
    try {
      const result = await saveCar(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        toast({ tone: 'error', title: 'Not saved', description: result.error });
        return;
      }

      setErrors({});
      setStatus(result.status);
      const savedValues = { ...values, slug: result.slug, slugAuto: false };
      setValues(savedValues);
      setSavedSnapshot(snapshot(savedValues, photos));
      setEditingSlug(false);
      toast({ tone: 'success', title: savedMessage(before, result.status) });

      if (result.created) router.replace(`/admin/cars/${result.id}/edit`);
    } catch {
      setFormError('Could not save. Check your connection and try again.');
      toast({ tone: 'error', title: 'Not saved', description: 'Check your connection and try again.' });
    } finally {
      setPendingTo(null);
    }
  }

  const price = toInt(values.price);
  const originalPrice = toInt(values.originalPrice);
  const kms = toInt(values.kmsDriven);

  return (
    <form
      noValidate
      {...{ [UNSAVED_GUARD_IGNORE]: '' }}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-4 md:gap-6"
    >
      {formError && <Alert>{formError}</Alert>}

      <FormSection id="basics" step={1} title="Basics" description="Which car is this?">
        <div className="grid gap-5 md:grid-cols-2">
          <Combobox
            id={fieldId('brandId')}
            label="Brand"
            required
            placeholder="Search brands"
            options={brandOptions}
            value={values.brandId}
            onChange={(id) => {
              setValues((v) => ({ ...v, brandId: id, modelId: v.brandId === id ? v.modelId : '' }));
              setErrors((e) => ({ ...e, brandId: undefined }));
            }}
            error={errors.brandId}
          />
          <Combobox
            id={fieldId('modelId')}
            label="Model"
            required
            placeholder={values.brandId ? 'Search models' : 'Choose a brand first'}
            disabled={!values.brandId}
            options={modelOptions}
            value={values.modelId}
            onChange={(id) => set('modelId', id)}
            onCreate={addModel}
            creating={creatingModel}
            createLabel={(q) => `Add “${q}” as a new ${brandName} model`}
            emptyText="Type the model name to add it"
            error={errors.modelId}
          />
        </div>
        <Input
          id={fieldId('variant')}
          label="Variant"
          hint="As written on the car or RC, e.g. SX Petrol AT"
          placeholder="e.g. SX"
          maxLength={80}
          value={values.variant}
          onChange={(e) => set('variant', e.target.value)}
          error={errors.variant}
        />
        <SlugField
          slug={slug}
          editing={editingSlug || !values.slugAuto}
          auto={values.slugAuto}
          savedSlug={car?.slug ?? null}
          canSuggest={suggestedSlug.length >= 3 && suggestedSlug !== values.slug}
          check={slugCheckFor}
          // An automatic address only errors while it is still empty; it clears as details are filled in.
          error={values.slugAuto && slug.length >= 3 ? undefined : errors.slug}
          onEdit={() => {
            setEditingSlug(true);
            setValues((v) => ({ ...v, slug, slugAuto: false }));
          }}
          onChange={(text) => {
            setValues((v) => ({ ...v, slug: text, slugAuto: false }));
            setErrors((e) => ({ ...e, slug: undefined }));
          }}
          onUseSuggested={() => {
            setEditingSlug(false);
            setValues((v) => ({ ...v, slugAuto: true }));
            setErrors((e) => ({ ...e, slug: undefined }));
          }}
        />
      </FormSection>

      <FormSection id="price" step={2} title="Price">
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id={fieldId('price')}
            label="Selling price (₹)"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 7,50,000"
            value={grouped(values.price)}
            onChange={(e) => set('price', digitsOnly(e.target.value).slice(0, 10))}
            hint={price ? `Shows on the website as ${formatPriceLakh(price)}` : 'Full amount in rupees'}
            error={errors.price}
          />
          <Input
            id={fieldId('originalPrice')}
            label="Original price (₹)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Optional"
            value={grouped(values.originalPrice)}
            onChange={(e) => set('originalPrice', digitsOnly(e.target.value).slice(0, 10))}
            hint={
              originalPrice
                ? `${formatPriceFull(originalPrice)} (${formatPriceLakh(originalPrice)})`
                : 'Optional, for reference'
            }
            error={errors.originalPrice}
          />
        </div>
      </FormSection>

      <FormSection id="vehicle" step={3} title="Vehicle details">
        <div className="grid gap-5 md:grid-cols-2">
          <Select
            id={fieldId('year')}
            label="Year"
            required
            placeholder="Choose year"
            options={YEAR_OPTIONS}
            value={values.year}
            onChange={(e) => set('year', e.target.value)}
            error={errors.year}
          />
          <Input
            id={fieldId('kmsDriven')}
            label="Kilometres driven"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 32,000"
            value={grouped(values.kmsDriven)}
            onChange={(e) => set('kmsDriven', digitsOnly(e.target.value).slice(0, 7))}
            hint={kms !== null ? formatKm(kms) : undefined}
            error={errors.kmsDriven}
          />
        </div>
        <ChoiceChips
          id={fieldId('fuelType')}
          name="fuelType"
          label="Fuel"
          required
          options={FUEL_OPTIONS}
          value={values.fuelType}
          onChange={(v) => set('fuelType', v)}
          error={errors.fuelType}
        />
        <ChoiceChips
          id={fieldId('transmission')}
          name="transmission"
          label="Transmission"
          required
          hint="AMT, CVT, DCT and torque converter all show as “Automatic” on the website."
          options={TRANSMISSION_OPTIONS}
          value={values.transmission}
          onChange={(v) => set('transmission', v)}
          error={errors.transmission}
        />
        <ChoiceChips
          id={fieldId('bodyType')}
          name="bodyType"
          label="Body type"
          required
          options={BODY_OPTIONS}
          value={values.bodyType}
          onChange={(v) => set('bodyType', v)}
          error={errors.bodyType}
        />
        <div className="grid gap-5 md:grid-cols-3">
          <Select
            id={fieldId('owners')}
            label="Owners"
            required
            options={OWNER_OPTIONS}
            value={values.owners}
            onChange={(e) => set('owners', e.target.value)}
            error={errors.owners}
          />
          <Input
            id={fieldId('engineCc')}
            label="Engine (cc)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 1197"
            value={values.engineCc}
            onChange={(e) => set('engineCc', digitsOnly(e.target.value).slice(0, 5))}
            error={errors.engineCc}
          />
          <Input
            id={fieldId('color')}
            label="Colour"
            placeholder="e.g. White"
            list="car-colour-options"
            maxLength={40}
            autoComplete="off"
            value={values.color}
            onChange={(e) => set('color', e.target.value)}
            error={errors.color}
          />
          <datalist id="car-colour-options">
            {COLOUR_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </FormSection>

      <FormSection id="registration" step={4} title="Registration">
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id={fieldId('registrationState')}
            label="State"
            list="car-state-options"
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            value={values.registrationState}
            onChange={(e) => set('registrationState', e.target.value)}
            hint="State code, e.g. TS or AP"
            error={errors.registrationState}
          />
          <datalist id="car-state-options">
            {REGISTRATION_STATES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Input
            id={fieldId('registrationCity')}
            label="City"
            maxLength={60}
            autoComplete="off"
            value={values.registrationCity}
            onChange={(e) => set('registrationCity', e.target.value)}
            error={errors.registrationCity}
          />
        </div>
      </FormSection>

      <FormSection id="features" step={5} title="Features" description="Tick everything the car has.">
        <FeaturePicker value={values.features} onChange={(f) => set('features', f)} error={errors.features} />
      </FormSection>

      <FormSection id="description" step={6} title="Description">
        <Textarea
          id={fieldId('description')}
          label="About this car"
          hideLabel
          rows={6}
          maxLength={5000}
          placeholder="Condition, service history, tyres, accident history, anything a buyer should know."
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          hint={`${values.description.length} / 5000`}
          error={errors.description}
        />
      </FormSection>

      <FormSection
        id="photos"
        step={7}
        title="Photos"
        description="At least one photo is needed to publish. Photos are resized automatically."
      >
        <PhotoUploader
          id={fieldId('photos')}
          carId={carId}
          photos={photos}
          setPhotos={(update) => {
            setPhotos(update);
            if (errors.photos) setErrors((e) => ({ ...e, photos: undefined }));
          }}
          error={errors.photos}
        />
      </FormSection>

      <FormSection id="visibility" step={8} title="Homepage">
        <Switch
          id={fieldId('featured')}
          label="Featured car"
          description="Shows this car in the Featured section on the homepage (when it is published)."
          checked={values.featured}
          onChange={(e) => set('featured', e.target.checked)}
        />
      </FormSection>

      <SaveBar status={status} dirty={dirty} pendingTo={pendingTo} uploading={uploading} onSave={save} />
    </form>
  );
}

function savedMessage(before: CarStatus | null, after: CarStatus) {
  if (before === after) return before === 'draft' ? 'Draft saved' : 'Changes saved';
  switch (after) {
    case 'draft':
      return before === null ? 'Draft saved' : before === 'archived' ? 'Restored as a draft' : 'Unpublished';
    case 'published':
      return before === 'reserved' || before === 'sold' ? 'Car is available again' : 'Published';
    case 'reserved':
      return 'Marked as reserved';
    case 'sold':
      return 'Marked as sold';
    case 'archived':
      return 'Archived';
  }
}

function SlugField({
  slug,
  editing,
  auto,
  savedSlug,
  canSuggest,
  check,
  error,
  onEdit,
  onChange,
  onUseSuggested,
}: {
  slug: string;
  editing: boolean;
  auto: boolean;
  savedSlug: string | null;
  canSuggest: boolean;
  check: { available: boolean } | null;
  error?: string;
  onEdit: () => void;
  onChange: (slug: string) => void;
  onUseSuggested: () => void;
}) {
  const unchanged = savedSlug !== null && slug === savedSlug;
  let status: React.ReactNode = null;
  if (slug.length >= 3 && !unchanged && !error) {
    if (!check) {
      status = (
        <span className="inline-flex items-center gap-1 text-muted">
          <Spinner width={12} height={12} /> Checking…
        </span>
      );
    } else if (check.available) {
      status = (
        <span className="inline-flex items-center gap-1 text-action-ink">
          <CheckIcon width={14} height={14} /> Available
        </span>
      );
    } else {
      status = (
        <span className="text-reserved-ink">
          {auto
            ? 'Another car has this address; a number will be added when you save.'
            : 'Another car already uses this address.'}
        </span>
      );
    }
  }

  if (!editing) {
    return (
      // Focus target for the error summary; the address itself is not editable here.
      <div id={fieldId('slug')} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
        <span className="text-label-lg text-navy">Web address</span>
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border bg-chip px-3 py-2.5',
            error ? 'border-danger' : 'border-transparent',
          )}
        >
          <code className="min-w-0 flex-1 text-body-md break-all text-chip-ink">
            /cars/{slug || <span className="text-muted">fills in as you type</span>}
          </code>
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={!slug} className="bg-card">
            Edit
          </Button>
        </div>
        <p className="text-body-sm">
          {error ? (
            <span className="font-medium text-danger">Fills in once you choose the year, brand and model.</span>
          ) : (
            (status ?? <span className="text-muted">Created automatically from the details above.</span>)
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        id={fieldId('slug')}
        label="Web address"
        value={slug}
        maxLength={SLUG_MAX_LENGTH}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        onBlur={(e) => onChange(slugify(e.target.value))}
        error={error}
        hint={savedSlug && slug !== savedSlug ? 'Changing this breaks links people have already shared.' : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
        <span>{status}</span>
        {canSuggest && (
          <Button size="sm" variant="ghost" onClick={onUseSuggested}>
            Use suggested address
          </Button>
        )}
      </div>
    </div>
  );
}
