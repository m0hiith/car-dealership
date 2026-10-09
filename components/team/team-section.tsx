import Image from 'next/image';
import { HomeSection } from '@/components/home/section';
import type { PublicTeamMember } from '@/lib/queries/homepage';

/** "Meet the team" on /about, from /team_members. Hidden when there is nobody to show. */
export function TeamSection({ members }: { members: PublicTeamMember[] }) {
  if (members.length === 0) return null;
  const only = members.length === 1 ? members[0] : null;

  return (
    <HomeSection id="team" title={only ? `Meet ${only.name}` : 'Meet the team'} tone="wash">
      <ul className={only ? 'max-w-2xl' : 'grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3'}>
        {members.map((m) => (
          <li
            key={m.id}
            className="flex h-full flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-card sm:flex-row md:p-6"
          >
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-chip">
              {m.photoUrl ? (
                <Image src={m.photoUrl} alt={m.name} fill sizes="96px" className="object-cover" />
              ) : (
                <span aria-hidden className="flex size-full items-center justify-center text-headline-lg text-navy">
                  {m.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-headline-sm text-navy">{m.name}</h3>
              {(m.role || m.yearsExperience !== null) && (
                <p className="text-label-lg text-action-ink">
                  {[
                    m.role,
                    m.yearsExperience !== null
                      ? `${m.yearsExperience} ${m.yearsExperience === 1 ? 'year' : 'years'} of experience`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {m.bio && <p className="pt-1 text-body-md whitespace-pre-line text-muted">{m.bio}</p>}
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
