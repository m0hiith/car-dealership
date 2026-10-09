'use client';

import { useState, type FormEvent } from 'react';
import { fieldDomId, focusFirstError } from '@/components/admin/form-save-bar';
import { Alert, Button, Input, Select, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveService } from '@/lib/actions/content';
import type { AdminService } from '@/lib/queries/admin-content';
import {
  fieldErrors,
  SERVICE_ICON_KEYS,
  SERVICE_ICONS,
  serviceSchema,
  type FieldErrors,
  type ServiceIcon,
  type ServiceInput,
} from '@/lib/validation/content';

const FIELD_ORDER = ['title', 'description', 'icon', 'ctaLabel', 'ctaLink'];

const ICON_OPTIONS = SERVICE_ICON_KEYS.map((value) => ({ value, label: SERVICE_ICONS[value] }));

/** Add or edit one service (inside a dialog). */
export function ServiceForm({ service, onDone }: { service: AdminService | null; onDone: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(service?.title ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [icon, setIcon] = useState<ServiceIcon>(service?.icon ?? 'car');
  const [ctaLabel, setCtaLabel] = useState(service?.ctaLabel ?? '');
  const [ctaLink, setCtaLink] = useState(service?.ctaLink ?? '');
  const [isVisible, setIsVisible] = useState(service?.isVisible ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function showErrors(next: FieldErrors, message: string) {
    setErrors(next);
    setFormError(message);
    focusFirstError(FIELD_ORDER, next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const input: ServiceInput = { id: service?.id, title, description, icon, ctaLabel, ctaLink, isVisible };
    const check = serviceSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveService(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        return;
      }
      toast({
        tone: 'success',
        title: service ? 'Service updated' : 'Service added',
        description: result.service.isVisible ? 'It is shown on the About page.' : 'It is hidden from the website.',
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
      <Input
        id={fieldDomId('title')}
        label="Title"
        required
        maxLength={60}
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />
      <Textarea
        id={fieldDomId('description')}
        label="Description"
        rows={3}
        maxLength={200}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        hint="One or two lines. Only describe what you actually offer: no warranties, guarantees or approval promises."
      />
      <Select
        id={fieldDomId('icon')}
        label="Icon"
        options={ICON_OPTIONS}
        value={icon}
        onChange={(e) => setIcon(e.target.value as ServiceIcon)}
        error={errors.icon}
      />
      <Input
        id={fieldDomId('ctaLink')}
        label="Button link (optional)"
        maxLength={300}
        autoComplete="off"
        placeholder="/cars"
        value={ctaLink}
        onChange={(e) => setCtaLink(e.target.value)}
        error={errors.ctaLink}
        hint={`A page on this site such as /cars, or a full https:// link. Leave empty for a WhatsApp button that says "Hi, I'm interested in your ${title.trim() || '…'} service".`}
      />
      <Input
        id={fieldDomId('ctaLabel')}
        label="Button text (optional)"
        maxLength={40}
        autoComplete="off"
        placeholder="Learn more"
        value={ctaLabel}
        onChange={(e) => setCtaLabel(e.target.value)}
        error={errors.ctaLabel}
        hint="Only used with a button link."
      />
      <Switch
        label="Show on website"
        description="Turn off to keep it here without showing it."
        checked={isVisible}
        onChange={(e) => setIsVisible(e.target.checked)}
      />
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {service ? 'Save changes' : 'Add service'}
        </Button>
      </div>
    </form>
  );
}
