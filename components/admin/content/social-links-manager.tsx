'use client';

import Image from 'next/image';
import { useState, useTransition, type ComponentType, type SVGProps } from 'react';
import { Badge, Button, Card, EmptyState, Switch } from '@/components/ui';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  FacebookIcon,
  InstagramIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  WhatsAppIcon,
  YoutubeIcon,
} from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { deleteSocialLink, moveSocialLink, setSocialLinkActive } from '@/lib/actions/content';
import type { AdminSocialLink } from '@/lib/queries/admin-content';
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS, type SocialPlatform } from '@/lib/validation/content';
import { SocialLinkForm } from './social-link-form';

const ICONS: Record<SocialPlatform, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  whatsapp: WhatsAppIcon,
  other: ExternalLinkIcon,
};

type Editing = { mode: 'new' } | { mode: 'edit'; link: AdminSocialLink } | null;

/**
 * Links for the scrolling social banner on the homepage. Each change saves
 * straight away (and refreshes this list), separately from the form above.
 */
export function SocialLinksManager({ links }: { links: AdminSocialLink[] }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminSocialLink | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = links.filter((l) => l.isActive).length;
  const full = links.length >= MAX_SOCIAL_LINKS;

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
    const link = deleting;
    if (!link) return;
    setDeleting(null);
    run(link.id, () => deleteSocialLink(link.id), 'Link deleted');
  }

  return (
    <section aria-labelledby="social-links-heading" className="mt-10 flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="social-links-heading" className="text-headline-md text-navy">
            Social links
          </h2>
          <p className="max-w-2xl text-body-md text-muted">
            {links.length
              ? `${shown} of ${links.length} shown in the scrolling banner on the homepage. Each change saves straight away.`
              : 'Instagram, YouTube, Facebook or WhatsApp links for the scrolling banner on the homepage.'}
          </p>
        </div>
        <Button onClick={() => setEditing({ mode: 'new' })} disabled={full}>
          <PlusIcon width={18} height={18} />
          Add link
        </Button>
      </div>
      {full && <p className="text-body-sm text-muted">You can have up to {MAX_SOCIAL_LINKS} links.</p>}

      {links.length === 0 ? (
        <EmptyState
          icon={<InstagramIcon width={22} height={22} />}
          title="No social links yet"
          description="Add your profiles, or a link to a reel or post. The banner is hidden until there is at least one."
          action={<Button onClick={() => setEditing({ mode: 'new' })}>Add link</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {links.map((link, index) => {
            const Icon = ICONS[link.platform];
            const busy = isPending && pendingId === link.id;
            return (
              <li key={link.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {link.thumbnailUrl ? (
                      <Image
                        src={link.thumbnailUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 shrink-0 rounded-control bg-chip object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-12 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-ink"
                      >
                        <Icon width={22} height={22} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-label-lg text-navy">{link.label}</h3>
                        <Badge tone={link.isActive ? 'blue' : 'neutral'} dot>
                          {link.isActive ? 'Shown' : 'Hidden'}
                        </Badge>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-body-sm text-action-ink hover:underline"
                      >
                        {SOCIAL_PLATFORMS[link.platform]} · {link.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <Switch
                      label="Show"
                      checked={link.isActive}
                      disabled={busy}
                      onChange={() =>
                        run(
                          link.id,
                          () => setSocialLinkActive(link.id, !link.isActive),
                          link.isActive ? 'Hidden from the website' : 'Shown on the website',
                        )
                      }
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === 0}
                        aria-label={`Move ${link.label} earlier`}
                        onClick={() => run(link.id, () => moveSocialLink(link.id, 'up'))}
                      >
                        <ArrowUpIcon width={16} height={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === links.length - 1}
                        aria-label={`Move ${link.label} later`}
                        onClick={() => run(link.id, () => moveSocialLink(link.id, 'down'))}
                      >
                        <ArrowDownIcon width={16} height={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ mode: 'edit', link })}>
                        <PencilIcon width={16} height={16} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        aria-label={`Delete ${link.label}`}
                        onClick={() => setDeleting(link)}
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
        title={editing?.mode === 'edit' ? 'Edit social link' : 'Add social link'}
        size="lg"
      >
        {editing && (
          <SocialLinkForm
            key={editing.mode === 'edit' ? editing.link.id : 'new'}
            link={editing.mode === 'edit' ? editing.link : null}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this link?"
        description={
          deleting
            ? `“${deleting.label}” will be removed from the banner. To keep it but hide it, turn off "Show" instead.`
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
