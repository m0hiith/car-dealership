'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Badge, Button, Card, EmptyState, Switch } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { deleteTeamMember, moveTeamMember, setTeamMemberVisible } from '@/lib/actions/content';
import type { AdminTeamMember } from '@/lib/queries/admin-content';
import { MAX_TEAM_MEMBERS } from '@/lib/validation/content';
import { TeamMemberForm } from './team-member-form';

type Editing = { mode: 'new' } | { mode: 'edit'; member: AdminTeamMember } | null;

/**
 * "Meet the team" on /about. Each change saves straight away (and refreshes
 * this list), separately from the form above.
 */
export function TeamManager({ members }: { members: AdminTeamMember[] }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminTeamMember | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shown = members.filter((m) => m.isVisible).length;
  const full = members.length >= MAX_TEAM_MEMBERS;

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
    const member = deleting;
    if (!member) return;
    setDeleting(null);
    run(member.id, () => deleteTeamMember(member.id), 'Removed from the team');
  }

  return (
    <section aria-labelledby="team-heading" className="mt-10 flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="team-heading" className="text-headline-md text-navy">
            Team
          </h2>
          <p className="max-w-2xl text-body-md text-muted">
            {members.length
              ? `${shown} of ${members.length} shown on the About page. With one person the heading reads "Meet {name}". Each change saves straight away.`
              : 'The owner and team, shown on the About page with photo, role and a short bio.'}
          </p>
        </div>
        <Button onClick={() => setEditing({ mode: 'new' })} disabled={full}>
          <PlusIcon width={18} height={18} />
          Add person
        </Button>
      </div>
      {full && <p className="text-body-sm text-muted">You can add up to {MAX_TEAM_MEMBERS} people.</p>}

      {members.length === 0 ? (
        <EmptyState
          title="No one added yet"
          description="Add the owner first. The section is hidden on the website until there is at least one person."
          action={<Button onClick={() => setEditing({ mode: 'new' })}>Add person</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {members.map((member, index) => {
            const busy = isPending && pendingId === member.id;
            return (
              <li key={member.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
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
                        {member.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-label-lg text-navy">{member.name}</h3>
                        <Badge tone={member.isVisible ? 'blue' : 'neutral'} dot>
                          {member.isVisible ? 'Shown' : 'Hidden'}
                        </Badge>
                      </div>
                      <p className="truncate text-body-sm text-muted">
                        {[
                          member.role,
                          member.yearsExperience !== null ? `${member.yearsExperience} yrs` : null,
                          member.bio ? null : 'No bio yet',
                        ]
                          .filter(Boolean)
                          .join(' · ') || ' '}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <Switch
                      label="Show"
                      checked={member.isVisible}
                      disabled={busy}
                      onChange={() =>
                        run(
                          member.id,
                          () => setTeamMemberVisible(member.id, !member.isVisible),
                          member.isVisible ? 'Hidden from the website' : 'Shown on the website',
                        )
                      }
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === 0}
                        aria-label={`Move ${member.name} earlier`}
                        onClick={() => run(member.id, () => moveTeamMember(member.id, 'up'))}
                      >
                        <ArrowUpIcon width={16} height={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={busy || index === members.length - 1}
                        aria-label={`Move ${member.name} later`}
                        onClick={() => run(member.id, () => moveTeamMember(member.id, 'down'))}
                      >
                        <ArrowDownIcon width={16} height={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ mode: 'edit', member })}>
                        <PencilIcon width={16} height={16} />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => setDeleting(member)}
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
        title={editing?.mode === 'edit' ? 'Edit team member' : 'Add to the team'}
        size="lg"
      >
        {editing && (
          <TeamMemberForm
            key={editing.mode === 'edit' ? editing.member.id : 'new'}
            member={editing.mode === 'edit' ? editing.member : null}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove from the team?"
        description={
          deleting
            ? `${deleting.name} and their photo will be removed. To keep them but hide them, turn off "Show" instead.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Remove
            </Button>
          </>
        }
      />
    </section>
  );
}
