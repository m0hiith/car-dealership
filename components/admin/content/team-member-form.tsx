'use client';

import { useState, type FormEvent } from 'react';
import { fieldDomId, focusFirstError } from '@/components/admin/form-save-bar';
import { MediaField, savedMedia } from '@/components/admin/media-field';
import { Alert, Button, Input, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveTeamMember } from '@/lib/actions/content';
import type { AdminTeamMember } from '@/lib/queries/admin-content';
import { fieldErrors, teamMemberSchema, type FieldErrors, type TeamMemberInput } from '@/lib/validation/content';

const FIELD_ORDER = ['name', 'role', 'yearsExperience', 'bio', 'photo'];

/** Add or edit one team member (inside a dialog). */
export function TeamMemberForm({ member, onDone }: { member: AdminTeamMember | null; onDone: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(member?.name ?? '');
  const [role, setRole] = useState(member?.role ?? '');
  const [bio, setBio] = useState(member?.bio ?? '');
  const [years, setYears] = useState(member?.yearsExperience != null ? String(member.yearsExperience) : '');
  const [isVisible, setIsVisible] = useState(member?.isVisible ?? true);
  const [photo, setPhoto] = useState(() =>
    savedMedia(member?.photoUrl ? { url: member.photoUrl, type: 'image' } : null),
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
    const input: TeamMemberInput = {
      id: member?.id,
      name,
      role,
      bio,
      yearsExperience: years,
      photo: photo.change,
      isVisible,
    };
    const check = teamMemberSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveTeamMember(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        return;
      }
      toast({
        tone: 'success',
        title: member ? 'Saved' : 'Added to the team',
        description: result.member.isVisible ? 'Shown on the About page.' : 'Hidden from the website.',
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
        id={fieldDomId('name')}
        label="Name"
        required
        maxLength={80}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Input
          id={fieldDomId('role')}
          label="Role (optional)"
          maxLength={80}
          autoComplete="off"
          placeholder="e.g. Owner, Sales Manager"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          error={errors.role}
        />
        <Input
          id={fieldDomId('yearsExperience')}
          label="Years of experience"
          inputMode="numeric"
          maxLength={2}
          autoComplete="off"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          error={errors.yearsExperience}
          hint="Optional."
        />
      </div>
      <Textarea
        id={fieldDomId('bio')}
        label="Short bio (optional)"
        rows={4}
        maxLength={500}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        error={errors.bio}
        hint="Two or three sentences. Stick to facts the dealership is happy to publish."
      />
      <div id={fieldDomId('photo')} tabIndex={-1}>
        <MediaField
          kind="team"
          label="Photo (optional)"
          hint="A clear, friendly headshot works best."
          value={photo}
          onChange={setPhoto}
          onBusyChange={setUploading}
          maxEdge={600}
          preview="round"
          error={errors.photo}
        />
      </div>
      <Switch
        label="Show on website"
        description="Turn off to keep them here without showing them."
        checked={isVisible}
        onChange={(e) => setIsVisible(e.target.checked)}
      />
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={uploading}>
          {uploading ? 'Uploading photo…' : member ? 'Save changes' : 'Add person'}
        </Button>
      </div>
    </form>
  );
}
