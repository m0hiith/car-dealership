import type { Metadata } from 'next';
import Link from 'next/link';
import { InventoryList } from '@/components/admin/inventory/inventory-list';
import { InventoryToolbar } from '@/components/admin/inventory/inventory-toolbar';
import { InventoryPagination } from '@/components/admin/inventory/pagination';
import { StatusTabs } from '@/components/admin/inventory/status-tabs';
import { AdminPageHeader } from '@/components/admin/page-header';
import { buttonStyles, EmptyState } from '@/components/ui';
import { CarIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth';
import type { CarStatus } from '@/lib/car-options';
import { getInventory } from '@/lib/queries/admin-cars';
import { hasInventoryFilters, inventoryHref, parseInventoryParams } from '@/lib/validation/admin-cars';

export const metadata: Metadata = { title: 'Cars' };

const EMPTY_TAB: Record<CarStatus, string> = {
  published: 'No published cars',
  draft: 'No drafts',
  reserved: 'No reserved cars',
  sold: 'No sold cars yet',
  archived: 'No archived cars',
};

export default async function AdminCarsPage({ searchParams }: PageProps<'/admin/cars'>) {
  await requireAdmin();
  const params = parseInventoryParams(await searchParams);
  const inventory = await getInventory(params);
  const filtered = hasInventoryFilters(params);

  const addCar = (label: string) => (
    <Link href="/admin/cars/new" className={buttonStyles()}>
      <PlusIcon width={18} height={18} />
      {label}
    </Link>
  );

  let content;
  if (inventory.cars.length > 0) {
    content = (
      <>
        <InventoryList cars={inventory.cars} />
        <InventoryPagination
          params={params}
          page={inventory.page}
          pageCount={inventory.pageCount}
          total={inventory.total}
        />
      </>
    );
  } else if (filtered) {
    content = (
      <EmptyState
        icon={<SearchIcon width={22} height={22} />}
        title="No cars match"
        description="Try a different search, or clear the filters."
        action={
          <Link
            href={inventoryHref(params, { q: undefined, brand: undefined, fuel: undefined, transmission: undefined })}
            className={buttonStyles({ variant: 'ghost' })}
          >
            Clear search and filters
          </Link>
        }
      />
    );
  } else if (inventory.counts.all === 0) {
    content = (
      <EmptyState
        icon={<CarIcon width={22} height={22} />}
        title="No cars yet"
        description="Add a car with its details and photos. You can save it as a draft and publish it later."
        action={addCar('Add your first car')}
      />
    );
  } else {
    content = (
      <EmptyState
        icon={<CarIcon width={22} height={22} />}
        title={params.status ? EMPTY_TAB[params.status] : 'No cars'}
        action={
          <Link href={inventoryHref(params, { status: undefined })} className={buttonStyles({ variant: 'ghost' })}>
            Show all cars
          </Link>
        }
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Cars"
        // With search or filters on, the counts are of matching cars only.
        description={
          filtered ? undefined : `${inventory.counts.all} ${inventory.counts.all === 1 ? 'car' : 'cars'} in total`
        }
        actions={addCar('Add car')}
      />
      <StatusTabs params={params} counts={inventory.counts} />
      <InventoryToolbar params={params} brands={inventory.brands} />
      {content}
    </>
  );
}
