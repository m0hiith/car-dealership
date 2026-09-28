import { Pagination } from '@/components/admin/pagination';
import { INVENTORY_PAGE_SIZE, inventoryHref, type InventoryParams } from '@/lib/validation/admin-cars';

export function InventoryPagination({
  params,
  page,
  pageCount,
  total,
}: {
  params: InventoryParams;
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      total={total}
      pageSize={INVENTORY_PAGE_SIZE}
      href={(p) => inventoryHref(params, { page: p })}
    />
  );
}
