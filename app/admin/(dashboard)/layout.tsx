import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdmin } from '@/lib/auth';
import { getNewLeadCount } from '@/lib/queries/dashboard';
import { getDealershipName } from '@/lib/queries/settings';

export default async function DashboardLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin();
  const [dealershipName, newLeadCount] = await Promise.all([getDealershipName(), getNewLeadCount()]);

  return (
    <AdminShell dealershipName={dealershipName} newLeadCount={newLeadCount}>
      {children}
    </AdminShell>
  );
}
