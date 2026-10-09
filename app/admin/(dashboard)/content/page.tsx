import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentForm } from '@/components/admin/content/content-form';
import { ServicesManager } from '@/components/admin/content/services-manager';
import { TeamManager } from '@/components/admin/content/team-manager';
import { SocialLinksManager } from '@/components/admin/content/social-links-manager';
import { AdminPageHeader } from '@/components/admin/page-header';
import { buttonStyles } from '@/components/ui';
import { ExternalLinkIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import {
  getAdminHomepageContent,
  getAdminServices,
  getAdminSocialLinks,
  getAdminTeamMembers,
} from '@/lib/queries/admin-content';

export const metadata: Metadata = { title: 'Homepage content' };

export default async function HomepageContentPage() {
  await requireAdmin();
  const [content, services, socialLinks, team] = await Promise.all([
    getAdminHomepageContent(),
    getAdminServices(),
    getAdminSocialLinks(),
    getAdminTeamMembers(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Homepage content"
        description={
          <>
            Featured cars are chosen with the Featured switch on each car. Contact details are in{' '}
            <Link href="/admin/settings" className="text-action-ink hover:underline">
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
      <TeamManager members={team} />
      <ServicesManager services={services} />
      <SocialLinksManager links={socialLinks} />
    </>
  );
}
