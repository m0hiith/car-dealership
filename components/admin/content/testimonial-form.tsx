'use client';

import { useState, type FormEvent } from 'react';
import { fieldDomId, focusFirstError } from '@/components/admin/form-save-bar';
import { MediaField, savedMedia } from '@/components/admin/media-field';
import { Alert, Button, Input, RatingInput, Switch, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveTestimonial } from '@/lib/actions/content';
import type { AdminTestimonial } from '@/lib/queries/admin-content';
import { fieldErrors, testimonialSchema, type FieldErrors, type TestimonialInput } from '@/lib/validation/content';

const FIELD_ORDER = ['customerName', 'rating', 'review', 'photo'];

/** Add or edit one testimonial (inside a dialog). */
export function TestimonialForm({ testimonial, onDone }: { testimonial: AdminTestimonial | null; onDone: () => void }) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(testimonial?.customerName ?? '');
  const [review, setReview] = useState(testimonial?.review ?? '');
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [isPublished, setIsPublished] = useState(testimonial?.isPublished ?? true);
  const [photo, setPhoto] = useState(() =>
    savedMedia(testimonial?.customerImage ? { url: testimonial.customerImage, type: 'image' } : null),
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
    const input: TestimonialInput = {
      id: testimonial?.id,
      customerName,
      review,
      rating,
      isPublished,
      photo: photo.change,
    };
    const check = testimonialSchema.safeParse(input);
    if (!check.success) {
      showErrors(fieldErrors(check.error), 'Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveTestimonial(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors, result.error);
        else setFormError(result.error);
        return;
      }
      toast({
        tone: 'success',
        title: testimonial ? 'Testimonial updated' : 'Testimonial added',
        description: result.testimonial.isPublished ? 'It is shown on the website.' : 'It is hidden from the website.',
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
        id={fieldDomId('customerName')}
        label="Customer name"
        required
        maxLength={100}
        autoComplete="off"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        error={errors.customerName}
      />
      <RatingInput id={fieldDomId('rating')} label="Rating" value={rating} onChange={setRating} error={errors.rating} />
      <Textarea
        id={fieldDomId('review')}
        label="Review"
        required
        rows={5}
        maxLength={2000}
        value={review}
        onChange={(e) => setReview(e.target.value)}
        error={errors.review}
        hint="In the customer's own words."
      />
      <div id={fieldDomId('photo')} tabIndex={-1}>
        <MediaField
          kind="testimonials"
          label="Photo (optional)"
          hint="Only with the customer's permission, e.g. a handover photo."
          value={photo}
          onChange={setPhoto}
          onBusyChange={setUploading}
          maxEdge={400}
          preview="round"
          error={errors.photo}
        />
      </div>
      <Switch
        label="Show on website"
        description="Turn off to keep it here without showing it."
        checked={isPublished}
        onChange={(e) => setIsPublished(e.target.checked)}
      />
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={uploading}>
          {uploading ? 'Uploading photo…' : testimonial ? 'Save changes' : 'Add testimonial'}
        </Button>
      </div>
    </form>
  );
}
