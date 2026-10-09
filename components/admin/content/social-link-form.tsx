'use client';

import { useState, type FormEvent } from 'react';
import { fieldDomId, focusFirstError } from '@/components/admin/form-save-bar';
import { MediaField, savedMedia } from '@/components/admin/media-field';
import { Alert, Button, Input, Select, Switch } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveSocialLink } from '@/lib/actions/content';
import type { AdminSocialLink } from '@/lib/queries/admin-content';
import {
  fieldErrors,
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORMS,
  socialLinkSchema,
  type FieldErrors,
  type SocialLinkInput,
  type SocialPlatform,
} from '@/lib/validation/content';

const FIELD_ORDER = ['platform', 'label', 'url', 'thumbnail'];

const PLATFORM_OPTIONS = SOCIAL_PLATFORM_KEYS.map((value) => ({ value, label: SOCIAL_PLATFORMS[value] }));

/** Add or edit one social link (inside a dialog). */
export function SocialLinkForm({ link, onDone }: { link: AdminSocialLink | null; onDone: () => void }) {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<SocialPlatform>(link?.platform ?? 'instagram');
  const [label, setLabel] = useState(link?.label ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [isActive, setIsActive] = useState(link?.isActive ?? true);
  const [thumbnail, setThumbnail] = useState(() =>
    savedMedia(link?.thumbnailUrl ? { url: link.thumbnailUrl, type: 'image' } : null),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function showErrors(next: FieldErrors, message: string) {
    setErrors(next);
    setFormError(message);
    focusFirstError(FIELD_ORDER, next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const input: SocialLinkInput = { id: link?.id, platform, label, url, thumbnail: thumbnail.change, isActive };
    const check = socialLinkSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveSocialLink(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        return;
      }
      toast({
        tone: 'success',
        title: link ? 'Link updated' : 'Link added',
        description: result.link.isActive ? 'It is shown in the homepage banner.' : 'It is hidden from the website.',
      });
      onDone();
    } catch {
      setFormError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && <Alert>{formError}</Alert>}
      <Select
        id={fieldDomId('platform')}
        label="Platform"
        required
        options={PLATFORM_OPTIONS}
        value={platform}
        onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
        error={errors.platform}
      />
      <Input
        id={fieldDomId('label')}
        label="Name"
        required
        maxLength={60}
        autoComplete="off"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={errors.label}
        hint='Shown on the banner, e.g. "Our Instagram" or "Handover reel".'
      />
      <Input
        id={fieldDomId('url')}
        label="Link"
        required
        type="url"
        inputMode="url"
        maxLength={500}
        autoComplete="off"
        placeholder="https://"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={errors.url}
        hint="Opens in a new tab. A profile, a reel or a post all work."
      />
      <div id={fieldDomId('thumbnail')} tabIndex={-1}>
        <MediaField
          kind="social"
          label="Thumbnail (optional)"
          hint="Shows as a picture card, e.g. a reel cover. Without one, the banner shows the platform icon."
          value={thumbnail}
          onChange={setThumbnail}
          onBusyChange={setUploading}
          maxEdge={800}
          preview="square"
          error={errors.thumbnail}
        />
      </div>
      <Switch
        label="Show on website"
        description="Turn off to keep it here without showing it."
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
      />
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={uploading}>
          {uploading ? 'Uploading image…' : link ? 'Save changes' : 'Add link'}
        </Button>
      </div>
    </form>
  );
}
