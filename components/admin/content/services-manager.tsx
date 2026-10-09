'use client';

import { useState, useTransition } from 'react';
import { ServiceIcon } from '@/components/services/service-icon';
import { Badge, Button, Card, EmptyState, Switch } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, TrashIcon, WrenchIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { deleteService, moveService, setServiceVisible } from '@/lib/actions/content';
import type { AdminService } from '@/lib/queries/admin-content';
import { MAX_SERVICES, PLACEHOLDER_PREFIX } from '@/lib/validation/content';
import { ServiceForm } from './service-form';

type Editing = { mode: 'new' } | { mode: 'edit'; service: AdminService } | null;

/**
 * The "Our services" cards on /about. Each change saves straight away (and
 * refreshes this list), separately from the form above.
 */
export function ServicesManager({ services }: { services: AdminService[] }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminService | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = services.filter((s) => s.isVisible).length;
  const full = services.length >= MAX_SERVICES;

  function run(id: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, success?: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) toast({ tone: 'error', title: 'Not updated', description: result.error });
        else if (success) toast({ tone: 'success', title: success });
      } catch {
        toast({ tone: 'error', title: 'Not updated', description: 'Check your connection and try again.' });
      } finally {
        setPendingId(null);
      }
    });
  }

  function confirmDelete() {
    const service = deleting;
    if (!service) return;
    setDeleting(null);
    run(service.id, () => deleteService(service.id), 'Service deleted');
  }

  return (
    <section aria-labelledby="services-heading" className="mt-10 flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="services-heading" className="text-headline-md text-navy">
            Services
          </h2>
          <p className="max-w-2xl text-body-md text-muted">
            {services.length
              ? `${shown} of ${services.length} shown under "Our services" on the About page. Each change saves straight away.`
              : 'What the dealership offers, shown as cards on the About page.'}
          </p>
        </div>
        <Button onClick={() => setEditing({ mode: 'new' })} disabled={full}>
          <PlusIcon width={18} height={18} />
          Add service
        </Button>
      </div>
      {full && <p className="text-body-sm text-muted">You can have up to {MAX_SERVICES} services.</p>}

      {services.length === 0 ? (
        <EmptyState
          icon={<WrenchIcon width={22} height={22} />}
          title="No services yet"
          description="Add what you offer. The section is hidden on the website until there is at least one."
          action={<Button onClick={() => setEditing({ mode: 'new' })}>Add service</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {services.map((service, index) => {
            const busy = isPending && pendingId === service.id;
            const placeholder = service.description.startsWith(PLACEHOLDER_PREFIX);
            return (
              <li key={service.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action-soft text-action-ink"
                    >
                      <ServiceIcon icon={service.icon} width={20} height={20} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-label-lg text-navy">{service.title}</h3>
                        <Badge tone={service.isVisible ? 'blue' : 'neutral'} dot>
                          {service.isVisible ? 'Shown' : 'Hidden'}
                        </Badge>
                        {placeholder && <Badge tone="amber">Needs your text</Badge>}
                      </div>
                      {service.description && (
                        <p className="line-clamp-2 text-body-sm text-muted">{service.description}</p>
                      )}
                      <p className="text-body-sm text-chip-ink">
                        Button:{' '}
                        {service.ctaLink
                          ? `${service.ctaLabel ?? 'Learn more'} → ${service.ctaLink}`
                          : 'WhatsApp enquiry'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <Switch
                      label="Show"
                      checked={service.isVisible}
                      disabled={busy}
                      onChange={() =>
                        run(
                          service.id,
                          () => setServiceVisible(service.id, !service.isVisible),
                          service.isVisible ? 'Hidden from the website' : 'Shown on the website',
                        )
                      }
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === 0}
                        aria-label={`Move ${service.title} earlier`}
                        onClick={() => run(service.id, () => moveService(service.id, 'up'))}
                      >
                        <ArrowUpIcon width={16} height={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === services.length - 1}
                        aria-label={`Move ${service.title} later`}
                        onClick={() => run(service.id, () => moveService(service.id, 'down'))}
                      >
                        <ArrowDownIcon width={16} height={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ mode: 'edit', service })}>
                        <PencilIcon width={16} height={16} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        aria-label={`Delete ${service.title}`}
                        onClick={() => setDeleting(service)}
                      >
                        <TrashIcon width={16} height={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? 'Edit service' : 'Add service'}
        size="lg"
      >
        {editing && (
          <ServiceForm
            key={editing.mode === 'edit' ? editing.service.id : 'new'}
            service={editing.mode === 'edit' ? editing.service : null}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this service?"
        description={
          deleting
            ? `“${deleting.title}” will be removed from the About page. To keep it but hide it, turn off "Show" instead.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      />
    </section>
  );
}
