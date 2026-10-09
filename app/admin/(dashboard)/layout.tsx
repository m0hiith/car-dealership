import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdmin } from '@/lib/auth';
import { getNewSellRequestCount } from '@/lib/queries/admin-sell';
import { getNewLeadCount } from '@/lib/queries/dashboard';
import { getDealershipName } from '@/lib/queries/settings';

export default async function DashboardLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin();
  const [dealershipName, newLeadCount, newSellCount] = await Promise.all([
    getDealershipName(),
    getNewLeadCount(),
    getNewSellRequestCount(),
  ]);

  return (
    <AdminShell dealershipName={dealershipName} newLeadCount={newLeadCount} newSellCount={newSellCount}>
      {children}
    </AdminShell>
  );
}
