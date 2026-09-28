'use client';

import { useState, type FormEvent } from 'react';
import { FormSection } from '@/components/admin/car-form/form-section';
import { useUnsavedChangesWarning } from '@/components/admin/car-form/use-unsaved-changes-warning';
import { fieldDomId, focusFirstError, FormSaveBar } from '@/components/admin/form-save-bar';
import { MediaField, savedMedia, type MediaState } from '@/components/admin/media-field';
import { Alert, Input, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveHomepageContent } from '@/lib/actions/content';
import type { AdminHomepageContent } from '@/lib/queries/admin-content';
import {
  fieldErrors,
  homepageContentSchema,
  type FieldErrors,
  type HomepageContentInput,
} from '@/lib/validation/content';
import { parseVideoUrl } from '@/lib/video';
import { WhyUsEditor, type WhyUsRow } from './why-us-editor';

type Values = Omit<AdminHomepageContent, 'heroMedia' | 'whyUs'> & { whyUs: WhyUsRow[] };

const FIELD_ORDER = [
  'heroTitle',
  'heroDescription',
  'heroMedia',
  'ctaText',
  'ctaLink',
  'whyUs',
  'videoUrl',
  'aboutTitle',
  'aboutBody',
];

function toValues(c: AdminHomepageContent): Values {
  return {
    heroTitle: c.heroTitle,
    heroDescription: c.heroDescription,
    ctaText: c.ctaText,
    ctaLink: c.ctaLink,
    whyUs: c.whyUs.map((item) => ({ ...item, key: crypto.randomUUID() })),
    videoUrl: c.videoUrl,
    aboutTitle: c.aboutTitle,
    aboutBody: c.aboutBody,
  };
}

function toInput(values: Values, media: MediaState): HomepageContentInput {
  return {
    heroTitle: values.heroTitle,
    heroDescription: values.heroDescription,
    heroMedia: media.change,
    ctaText: values.ctaText,
    ctaLink: values.ctaLink,
    whyUs: values.whyUs.map(({ title, description }) => ({ title, description })),
    videoUrl: values.videoUrl,
    aboutTitle: values.aboutTitle,
    aboutBody: values.aboutBody,
  };
}

export function ContentForm({ initial }: { initial: AdminHomepageContent }) {
  const { toast } = useToast();
  const [values, setValues] = useState(() => toValues(initial));
  const [media, setMedia] = useState(() => savedMedia(initial.heroMedia));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(toValues(initial), savedMedia(initial.heroMedia))));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const input = toInput(values, media);
  const dirty = JSON.stringify(input) !== saved;
  useUnsavedChangesWarning(dirty);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
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
    const check = homepageContentSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveHomepageContent(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        toast({ tone: 'error', title: 'Not saved', description: result.error });
        return;
      }
      const nextMedia: MediaState = { ...media, change: 'keep' };
      setMedia(nextMedia);
      setSaved(JSON.stringify(toInput(values, nextMedia)));
      setErrors({});
      toast({ tone: 'success', title: 'Homepage updated', description: 'The changes are live on the website.' });
    } catch {
      setFormError('Could not save. Check your connection and try again.');
      toast({ tone: 'error', title: 'Not saved', description: 'Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  const video = parseVideoUrl(values.videoUrl);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError && <Alert>{formError}</Alert>}

      <FormSection id="hero" step={1} title="Hero" description="The first thing visitors see on the homepage.">
        <Input
          id={fieldDomId('heroTitle')}
          label="Headline"
          required
          maxLength={120}
          value={values.heroTitle}
          onChange={(e) => set('heroTitle', e.target.value)}
          error={errors.heroTitle}
        />
        <Textarea
          id={fieldDomId('heroDescription')}
          label="Description"
          rows={3}
          maxLength={400}
          value={values.heroDescription}
          onChange={(e) => set('heroDescription', e.target.value)}
          error={errors.heroDescription}
          hint="One or two short sentences."
        />
        <div id={fieldDomId('heroMedia')} tabIndex={-1}>
          <MediaField
            kind="hero"
            label="Background photo or video"
            hint="A wide photo works best (landscape, at least 1600px). A short MP4 video under 50 MB also works; it plays silently on a loop."
            value={media}
            onChange={setMedia}
            onBusyChange={setUploading}
            allowVideo
            error={errors.heroMedia}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id={fieldDomId('ctaText')}
            label="Button text"
            maxLength={40}
            placeholder="Browse cars"
            value={values.ctaText}
            onChange={(e) => set('ctaText', e.target.value)}
            error={errors.ctaText}
          />
          <Input
            id={fieldDomId('ctaLink')}
            label="Button link"
            maxLength={300}
            placeholder="/cars"
            value={values.ctaLink}
            onChange={(e) => set('ctaLink', e.target.value)}
            error={errors.ctaLink}
            hint="A page on this site such as /cars or /contact. Leave both empty to hide the button."
          />
        </div>
      </FormSection>

      <FormSection
        id="why-us"
        step={2}
        title="Why choose us"
        description="Short, factual reasons to buy from you. Only claim what the dealership actually offers."
      >
        <WhyUsEditor rows={values.whyUs} onChange={(rows) => set('whyUs', rows)} errors={errors} />
      </FormSection>

      <FormSection
        id="video"
        step={3}
        title="Dealership video"
        description="Optional. Shown on the homepage only when set."
      >
        <Input
          id={fieldDomId('videoUrl')}
          label="Video link"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://www.youtube.com/watch?v=…"
          value={values.videoUrl}
          onChange={(e) => set('videoUrl', e.target.value)}
          error={errors.videoUrl}
          hint={
            values.videoUrl && video
              ? video.kind === 'youtube'
                ? 'YouTube video found.'
                : 'Video file found.'
              : 'Paste a YouTube link, or a link to an .mp4 file.'
          }
        />
      </FormSection>

      <FormSection id="about" step={4} title="About page" description="The text on the About page of the website.">
        <Input
          id={fieldDomId('aboutTitle')}
          label="Heading"
          maxLength={120}
          value={values.aboutTitle}
          onChange={(e) => set('aboutTitle', e.target.value)}
          error={errors.aboutTitle}
          hint='Leave empty to use "About" and the dealership name.'
        />
        <Textarea
          id={fieldDomId('aboutBody')}
          label="Text"
          rows={8}
          maxLength={5000}
          value={values.aboutBody}
          onChange={(e) => set('aboutBody', e.target.value)}
          error={errors.aboutBody}
          hint="Leave a blank line between paragraphs."
        />
      </FormSection>

      <FormSaveBar dirty={dirty} saving={saving} busyNote={uploading ? 'Uploading…' : null} />
    </form>
  );
}
