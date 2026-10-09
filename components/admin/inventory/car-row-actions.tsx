'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { MORE_STATUS_ACTIONS, PUBLISH_ACTION, type StatusAction } from '@/components/admin/car-status-actions';
import { Button, buttonStyles } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CopyIcon, ExternalLinkIcon, EyeIcon, MoreIcon, PencilIcon, TrashIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { deleteDraftCar, duplicateCar, setCarStatus, setShowInSoldSection } from '@/lib/actions/cars';
import type { CarStatus } from '@/lib/car-options';
import { isPublicStatus } from '@/lib/car-status';

export type RowActionsCar = {
  id: string;
  slug: string;
  status: CarStatus;
  title: string;
  showInSoldSection: boolean;
};

type Confirming = { kind: 'status'; action: StatusAction } | { kind: 'delete' };

const STATUS_TOASTS: Record<CarStatus, string> = {
  draft: 'Moved to drafts',
  published: 'Published',
  reserved: 'Marked as reserved',
  sold: 'Marked as sold',
  archived: 'Archived',
};

/** Edit button plus an action sheet: view, duplicate, status changes and (drafts only) delete. */
export function CarRowActions({ car, className }: { car: RowActionsCar; className?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [pending, startTransition] = useTransition();

  const statusActions = car.status === 'draft' ? [PUBLISH_ACTION] : MORE_STATUS_ACTIONS[car.status];

  function changeStatus(action: StatusAction) {
    setSheetOpen(false);
    setConfirming(null);
    startTransition(async () => {
      try {
        const result = await setCarStatus({ id: car.id, to: action.to });
        if (result.ok) toast({ tone: 'success', title: STATUS_TOASTS[action.to], description: car.title });
        else toast({ tone: 'error', title: 'Not changed', description: result.error });
      } catch {
        toast({ tone: 'error', title: 'Not changed', description: 'Check your connection and try again.' });
      }
    });
  }

  function duplicate() {
    setSheetOpen(false);
    startTransition(async () => {
      try {
        const result = await duplicateCar(car.id);
        if (!result.ok) {
          toast({ tone: 'error', title: 'Not duplicated', description: result.error });
          return;
        }
        toast({ tone: 'success', title: 'Copy created as a draft', description: 'Add photos, then publish.' });
        router.push(`/admin/cars/${result.id}/edit`);
      } catch {
        toast({ tone: 'error', title: 'Not duplicated', description: 'Check your connection and try again.' });
      }
    });
  }

  function toggleSoldSection() {
    setSheetOpen(false);
    startTransition(async () => {
      try {
        const result = await setShowInSoldSection(car.id, !car.showInSoldSection);
        if (result.ok) {
          toast({
            tone: 'success',
            title: car.showInSoldSection ? 'Hidden from Recently Sold' : 'Shown in Recently Sold',
            description: car.title,
          });
        } else {
          toast({ tone: 'error', title: 'Not changed', description: result.error });
        }
      } catch {
        toast({ tone: 'error', title: 'Not changed', description: 'Check your connection and try again.' });
      }
    });
  }

  function remove() {
    setConfirming(null);
    startTransition(async () => {
      try {
        const result = await deleteDraftCar(car.id);
        if (result.ok) toast({ tone: 'success', title: 'Draft deleted', description: car.title });
        else toast({ tone: 'error', title: 'Not deleted', description: result.error });
      } catch {
        toast({ tone: 'error', title: 'Not deleted', description: 'Check your connection and try again.' });
      }
    });
  }

  const confirm =
    confirming?.kind === 'delete'
      ? {
          title: 'Delete this draft?',
          body: `${car.title} and its photos will be permanently deleted. This cannot be undone.`,
          button: 'Delete draft',
          run: remove,
        }
      : confirming?.action.confirm
        ? { ...confirming.action.confirm, run: () => changeStatus(confirming.action) }
        : null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link
        href={`/admin/cars/${car.id}/edit`}
        className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'bg-card' })}
        aria-label={`Edit ${car.title}`}
      >
        <PencilIcon width={14} height={14} />
        Edit
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className="bg-card px-2"
        onClick={() => setSheetOpen(true)}
        loading={pending}
        aria-label={`More actions for ${car.title}`}
        aria-haspopup="dialog"
      >
        {!pending && <MoreIcon width={18} height={18} />}
      </Button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={car.title}>
        <ul className="flex flex-col gap-2">
          {isPublicStatus(car.status) && (
            <li>
              <SheetItem
                href={`/cars/${car.slug}`}
                icon={<ExternalLinkIcon width={16} height={16} />}
                label="View on site"
                description="Opens the public page in a new tab."
              />
            </li>
          )}
          <li>
            <SheetItem
              onClick={duplicate}
              icon={<CopyIcon width={16} height={16} />}
              label="Duplicate"
              description="New draft with the same details and features. Photos and web address are not copied."
            />
          </li>
          {car.status === 'sold' && (
            <li>
              <SheetItem
                onClick={toggleSoldSection}
                icon={<EyeIcon width={16} height={16} />}
                label={car.showInSoldSection ? 'Hide from Recently Sold' : 'Show in Recently Sold'}
                description={
                  car.showInSoldSection
                    ? 'Removes this car from the homepage section. Its link still says it has been sold.'
                    : 'Adds this car back to the Recently Sold section on the homepage.'
                }
              />
            </li>
          )}
        </ul>

        <h3 className="mt-5 mb-2 text-label-md text-muted uppercase">Change status</h3>
        <ul className="flex flex-col gap-2">
          {statusActions.map((action) => (
            <li key={action.to}>
              <SheetItem
                onClick={() => {
                  if (action.confirm) {
                    setSheetOpen(false);
                    setConfirming({ kind: 'status', action });
                  } else {
                    changeStatus(action);
                  }
                }}
                label={action.label}
                description={action.description}
              />
            </li>
          ))}
        </ul>

        {car.status === 'draft' && (
          <div className="mt-5 border-t border-border pt-4">
            <SheetItem
              danger
              onClick={() => {
                setSheetOpen(false);
                setConfirming({ kind: 'delete' });
              }}
              icon={<TrashIcon width={16} height={16} />}
              label="Delete draft"
              description="Permanently removes this draft and its photos."
            />
          </div>
        )}
      </BottomSheet>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirming(null)}
        title={confirm?.title ?? ''}
        description={confirm?.body}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm?.run}>
              {confirm?.button}
            </Button>
          </>
        }
      />
    </div>
  );
}

function SheetItem({
  label,
  description,
  icon,
  href,
  onClick,
  danger = false,
}: {
  label: string;
  description: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = cn(
    'flex w-full items-start gap-3 rounded-control border px-4 py-3 text-left focus-ring transition-colors',
    danger
      ? 'border-danger-soft hover:border-danger hover:bg-danger-soft'
      : 'border-border hover:border-tint hover:bg-canvas',
  );
  const content = (
    <>
      {icon && <span className={cn('mt-0.5 shrink-0', danger ? 'text-danger' : 'text-muted')}>{icon}</span>}
      <span className="flex flex-col gap-0.5">
        <span className={cn('text-label-lg', danger ? 'text-danger' : 'text-navy')}>{label}</span>
        <span className="text-body-sm text-muted">{description}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener" className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
