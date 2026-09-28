import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentForm } from '@/components/admin/content/content-form';
import { AdminPageHeader } from '@/components/admin/page-header';
import { buttonStyles } from '@/components/ui';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import { getAdminHomepageContent } from '@/lib/queries/admin-content';

export const metadata: Metadata = { title: 'Homepage content' };

export default async function HomepageContentPage() {
  await requireAdmin();
  const content = await getAdminHomepageContent();

  return (
    <>
      <AdminPageHeader
        title="Homepage content"
        description={
          <>
            Featured cars are chosen with the Featured switch on each car. Contact details are in{' '}
            <Link href="/admin/settings" className="text-action hover:underline">
              Settings
            </Link>
            .
          </>
        }
        actions={
          <Link href="/" target="_blank" className={buttonStyles({ variant: 'ghost' })}>
            <ExternalLinkIcon width={18} height={18} />
            View homepage
          </Link>
        }
      />
      <ContentForm initial={content} />
    </>
  );
}
