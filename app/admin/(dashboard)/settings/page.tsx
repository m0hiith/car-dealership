import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/content/settings-form';
import { AdminPageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { getAdminSiteSettings } from '@/lib/queries/admin-content';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getAdminSiteSettings();

  return (
    <>
      <AdminPageHeader title="Settings" description="Dealership details used across the whole website." />
      <SettingsForm initial={settings} />
    </>
  );
}
