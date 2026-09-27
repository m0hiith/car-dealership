import { EmptyState } from '@/components/ui';
import { AdminPageHeader } from './page-header';

/** Stand-in for admin sections that later phases build (CLAUDE.md §7). */
export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <AdminPageHeader title={title} />
      <EmptyState title="Not built yet" description={`This section arrives in phase ${phase}.`} />
    </>
  );
}
