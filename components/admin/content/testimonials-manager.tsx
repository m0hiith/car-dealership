'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Badge, Button, Card, EmptyState, StarRating, Switch } from '@/components/ui';
import { PencilIcon, PlusIcon, QuoteIcon, TrashIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { deleteTestimonial, setTestimonialPublished } from '@/lib/actions/content';
import { formatDate } from '@/lib/format';
import type { AdminTestimonial } from '@/lib/queries/admin-content';
import { TestimonialForm } from './testimonial-form';

type Editing = { mode: 'new' } | { mode: 'edit'; testimonial: AdminTestimonial } | null;

/**
 * The list comes from the server; each action revalidates this page, so the
 * list refreshes itself after a change.
 */
export function TestimonialsManager({ testimonials }: { testimonials: AdminTestimonial[] }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const published = testimonials.filter((t) => t.isPublished).length;

  function togglePublished(t: AdminTestimonial) {
    setPendingId(t.id);
    startTransition(async () => {
      const result = await setTestimonialPublished(t.id, !t.isPublished);
      setPendingId(null);
      if (!result.ok) toast({ tone: 'error', title: 'Not updated', description: result.error });
      else toast({ tone: 'success', title: t.isPublished ? 'Hidden from the website' : 'Published on the website' });
    });
  }

  function confirmDelete() {
    const t = deleting;
    if (!t) return;
    startTransition(async () => {
      const result = await deleteTestimonial(t.id);
      setDeleting(null);
      if (!result.ok) toast({ tone: 'error', title: 'Not deleted', description: result.error });
      else toast({ tone: 'success', title: 'Testimonial deleted' });
    });
  }

  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description={
          testimonials.length
            ? `${published} of ${testimonials.length} shown on the website. Only published ones appear.`
            : 'Reviews from your customers, shown on the homepage.'
        }
        actions={
          <Button onClick={() => setEditing({ mode: 'new' })}>
            <PlusIcon width={18} height={18} />
            Add testimonial
          </Button>
        }
      />

      {testimonials.length === 0 ? (
        <EmptyState
          icon={<QuoteIcon width={22} height={22} />}
          title="No testimonials yet"
          description="Add what customers have said about buying from you. Only add real reviews, with the customer's permission."
          action={<Button onClick={() => setEditing({ mode: 'new' })}>Add testimonial</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {testimonials.map((t) => (
            <li key={t.id}>
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-start gap-3">
                  {t.customerImage ? (
                    <Image
                      src={t.customerImage}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-full bg-chip object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-chip text-headline-sm text-navy"
                    >
                      {t.customerName.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="truncate text-headline-sm text-navy">{t.customerName}</h2>
                    <StarRating rating={t.rating} size={14} />
                  </div>
                  <Badge tone={t.isPublished ? 'blue' : 'neutral'} dot>
                    {t.isPublished ? 'Published' : 'Hidden'}
                  </Badge>
                </div>
                <p className="line-clamp-4 flex-1 text-body-md whitespace-pre-line text-chip-ink">{t.review}</p>
                <p className="text-body-sm text-muted">Added {formatDate(t.createdAt)}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <Switch
                    label="Show on website"
                    checked={t.isPublished}
                    disabled={isPending && pendingId === t.id}
                    onChange={() => togglePublished(t)}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ mode: 'edit', testimonial: t })}>
                      <PencilIcon width={16} height={16} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete testimonial from ${t.customerName}`}
                      onClick={() => setDeleting(t)}
                    >
                      <TrashIcon width={16} height={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? 'Edit testimonial' : 'Add testimonial'}
        size="lg"
      >
        {editing && (
          <TestimonialForm
            key={editing.mode === 'edit' ? editing.testimonial.id : 'new'}
            testimonial={editing.mode === 'edit' ? editing.testimonial : null}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this testimonial?"
        description={
          deleting
            ? `The review from ${deleting.customerName} will be removed permanently. To keep it but hide it from the website, turn off "Show on website" instead.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={isPending && deleting !== null} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
