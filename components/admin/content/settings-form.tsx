'use client';

import { useState, type FormEvent } from 'react';
import { FormSection } from '@/components/admin/car-form/form-section';
import { useUnsavedChangesWarning } from '@/components/admin/car-form/use-unsaved-changes-warning';
import { fieldDomId, focusFirstError, FormSaveBar } from '@/components/admin/form-save-bar';
import { MediaField, savedMedia, type MediaState } from '@/components/admin/media-field';
import { Alert, Input, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveSiteSettings } from '@/lib/actions/content';
import type { AdminSiteSettings } from '@/lib/queries/admin-content';
import {
  fieldErrors,
  SOCIAL_NETWORKS,
  siteSettingsSchema,
  type FieldErrors,
  type SiteSettingsInput,
  type SocialNetwork,
} from '@/lib/validation/content';

type Values = Omit<AdminSiteSettings, 'logoUrl' | 'socials'> & { socials: Record<SocialNetwork, string> };

const NETWORKS = Object.keys(SOCIAL_NETWORKS) as SocialNetwork[];

const FIELD_ORDER = [
  'dealershipName',
  'logo',
  'phone',
  'whatsappNumber',
  'address',
  'mapUrl',
  'businessHours',
  ...NETWORKS.map((n) => `socials.${n}`),
  'feedbackDelayMinutes',
  'googleSiteVerification',
];

function toValues(s: AdminSiteSettings): Values {
  return {
    dealershipName: s.dealershipName,
    phone: s.phone,
    whatsappNumber: s.whatsappNumber,
    address: s.address,
    mapUrl: s.mapUrl,
    businessHours: s.businessHours,
    socials: { instagram: '', facebook: '', youtube: '', ...s.socials },
    feedbackEnabled: s.feedbackEnabled,
    feedbackDelayMinutes: s.feedbackDelayMinutes,
    googleSiteVerification: s.googleSiteVerification,
  };
}

function toInput(values: Values, logo: MediaState): SiteSettingsInput {
  return { ...values, logo: logo.change };
}

export function SettingsForm({ initial }: { initial: AdminSiteSettings }) {
  const { toast } = useToast();
  const initialLogo = savedMedia(initial.logoUrl ? { url: initial.logoUrl, type: 'image' } : null);
  const [values, setValues] = useState(() => toValues(initial));
  const [logo, setLogo] = useState(initialLogo);
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(toValues(initial), initialLogo)));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const input = toInput(values, logo);
  const dirty = JSON.stringify(input) !== saved;
  useUnsavedChangesWarning(dirty);

  function set<K extends Exclude<keyof Values, 'socials'>>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function showErrors(next: FieldErrors, message: string) {
    setErrors(next);
    setFormError(message);
    focusFirstError(FIELD_ORDER, next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const check = siteSettingsSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveSiteSettings(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        toast({ tone: 'error', title: 'Not saved', description: result.error });
        return;
      }
      const nextLogo: MediaState = { ...logo, change: 'keep' };
      setLogo(nextLogo);
      setSaved(JSON.stringify(toInput(values, nextLogo)));
      setErrors({});
      toast({ tone: 'success', title: 'Settings saved', description: 'The changes are live on the website.' });
    } catch {
      setFormError('Could not save. Check your connection and try again.');
      toast({ tone: 'error', title: 'Not saved', description: 'Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  const text = (key: Exclude<keyof Values, 'socials' | 'feedbackEnabled'>) => ({
    id: fieldDomId(key),
    value: values[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError && <Alert>{formError}</Alert>}

      <FormSection id="dealership" step={1} title="Dealership" description="Shown in the website header and footer.">
        <Input label="Dealership name" required maxLength={100} {...text('dealershipName')} />
        <div id={fieldDomId('logo')} tabIndex={-1}>
          <MediaField
            kind="logo"
            label="Logo"
            hint="A square or wide logo on a plain background. JPG, PNG or WebP."
            value={logo}
            onChange={setLogo}
            onBusyChange={setUploading}
            maxEdge={512}
            preview="square"
            error={errors.logo}
          />
        </div>
      </FormSection>

      <FormSection
        id="contact"
        step={2}
        title="Contact details"
        description="Used for the Call and WhatsApp buttons and the contact section across the website."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Phone" type="tel" inputMode="tel" maxLength={20} placeholder="98765 43210" {...text('phone')} />
          <Input
            label="WhatsApp number"
            type="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="98765 43210"
            hint="A mobile number with WhatsApp."
            {...text('whatsappNumber')}
          />
        </div>
        <Textarea label="Address" rows={3} maxLength={400} {...text('address')} />
        <Input
          label="Google Maps link"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://maps.app.goo.gl/…"
          hint="In Google Maps, find the dealership, tap Share and copy the link."
          {...text('mapUrl')}
        />
        <Textarea
          label="Business hours"
          rows={2}
          maxLength={200}
          placeholder={'Mon–Sat: 10 AM – 8 PM\nSun: 11 AM – 5 PM'}
          {...text('businessHours')}
        />
      </FormSection>

      <FormSection id="socials" step={3} title="Social links" description="Optional. Shown as icons in the footer.">
        {NETWORKS.map((network) => (
          <Input
            key={network}
            id={fieldDomId(`socials.${network}`)}
            label={SOCIAL_NETWORKS[network]}
            type="url"
            inputMode="url"
            maxLength={300}
            placeholder="https://"
            value={values.socials[network]}
            onChange={(e) => setValues((v) => ({ ...v, socials: { ...v.socials, [network]: e.target.value } }))}
            error={errors[`socials.${network}`]}
          />
        ))}
      </FormSection>

      <FormSection
        id="feedback"
        step={4}
        title="Feedback popup"
        description="A small card asking visitors how their experience is going. Each visitor sees it at most once every 30 days."
      >
        <Switch
          label="Show the feedback popup"
          description="Answers appear under Feedback in the sidebar."
          checked={values.feedbackEnabled}
          onChange={(e) => set('feedbackEnabled', e.target.checked)}
        />
        <Input
          {...text('feedbackDelayMinutes')}
          label="Show it after (minutes)"
          inputMode="numeric"
          maxLength={2}
          disabled={!values.feedbackEnabled}
          hint="Time spent browsing the website, added up across pages. 1 to 60 minutes."
        />
      </FormSection>

      <FormSection
        id="search"
        step={5}
        title="Google Search Console"
        description="Proves to Google that you own this website, so you can see how it appears in search."
      >
        <Input
          {...text('googleSiteVerification')}
          label="Verification tag (optional)"
          autoComplete="off"
          spellCheck={false}
          placeholder='<meta name="google-site-verification" content="…" />'
          hint='In Search Console, add the website as a "URL prefix" property and choose the "HTML tag" method, then paste the tag here and save.'
        />
      </FormSection>

      <FormSaveBar dirty={dirty} saving={saving} busyNote={uploading ? 'Uploading…' : null} />
    </form>
  );
}
