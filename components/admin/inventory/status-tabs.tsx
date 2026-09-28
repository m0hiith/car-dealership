import { StatusTabBar } from '@/components/admin/status-tab-bar';
import type { CarStatus } from '@/lib/car-options';
import type { InventoryCounts } from '@/lib/queries/admin-cars';
import { inventoryHref, type InventoryParams } from '@/lib/validation/admin-cars';

const TABS: { status: CarStatus | undefined; label: string }[] = [
  { status: undefined, label: 'All' },
  { status: 'published', label: 'Published' },
  { status: 'draft', label: 'Draft' },
  { status: 'reserved', label: 'Reserved' },
  { status: 'sold', label: 'Sold' },
  { status: 'archived', label: 'Archived' },
];

export function StatusTabs({ params, counts }: { params: InventoryParams; counts: InventoryCounts }) {
  return (
    <StatusTabBar
      label="Filter by status"
      tabs={TABS.map((tab) => ({
        key: tab.label,
        label: tab.label,
        count: counts[tab.status ?? 'all'],
        href: inventoryHref(params, { status: tab.status }),
        active: params.status === tab.status,
      }))}
    />
  );
}
