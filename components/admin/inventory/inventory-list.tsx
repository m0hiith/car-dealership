import Image from 'next/image';
import Link from 'next/link';
import { CarStatusBadge } from '@/components/admin/status-badge';
import { Card } from '@/components/ui';
import { ImageIcon, StarIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatDate, formatKm, formatPriceLakh } from '@/lib/format';
import type { InventoryCar } from '@/lib/queries/admin-cars';
import { CarRowActions } from './car-row-actions';

/** Table from 1200px, card list below it. Both are server-rendered; only the actions are client code. */
export function InventoryList({ cars }: { cars: InventoryCar[] }) {
  return (
    <>
      <InventoryTable cars={cars} />
      <ul className="flex flex-col gap-3 lg:hidden">
        {cars.map((car) => (
          <li key={car.id}>
            <InventoryCard car={car} />
          </li>
        ))}
      </ul>
    </>
  );
}

function rowActionsCar(car: InventoryCar) {
  return { id: car.id, slug: car.slug, status: car.status, title: car.title };
}

function Thumbnail({ car, className }: { car: InventoryCar; className?: string }) {
  return (
    <div className={cn('relative aspect-[16/10] shrink-0 overflow-hidden rounded-control bg-chip', className)}>
      {car.coverUrl ? (
        <Image src={car.coverUrl} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted" title="No photos yet">
          <ImageIcon width={18} height={18} />
          <span className="sr-only">No photos yet</span>
        </div>
      )}
    </div>
  );
}

function Featured({ featured }: { featured: boolean }) {
  return featured ? (
    <span className="inline-flex text-highlight" title="Featured on the homepage">
      <StarIcon width={18} height={18} fill="currentColor" />
      <span className="sr-only">Featured</span>
    </span>
  ) : (
    <span className="text-muted">
      <span aria-hidden>–</span>
      <span className="sr-only">Not featured</span>
    </span>
  );
}

function VehicleName({ car }: { car: InventoryCar }) {
  return (
    <Link
      href={`/admin/cars/${car.id}/edit`}
      className="flex min-w-0 flex-col rounded-control focus-ring hover:[&>span:first-child]:underline"
    >
      <span className="truncate text-label-lg text-navy">{car.title}</span>
      {car.variant && <span className="truncate text-body-sm text-muted">{car.variant}</span>}
    </Link>
  );
}

const th = 'px-3 py-3 text-left text-label-md text-muted whitespace-nowrap first:pl-4 last:pr-4';
const td = 'px-3 py-3 align-middle first:pl-4 last:pr-4';

function InventoryTable({ cars }: { cars: InventoryCar[] }) {
  return (
    <Card padding="none" className="hidden overflow-x-auto lg:block">
      <table className="w-full text-body-md text-chip-ink">
        <thead className="border-b border-border bg-canvas">
          <tr>
            <th scope="col" className={th}>
              <span className="sr-only">Photo</span>
            </th>
            <th scope="col" className={th}>
              Vehicle
            </th>
            <th scope="col" className={cn(th, 'text-right')}>
              Price
            </th>
            <th scope="col" className={th}>
              Year
            </th>
            <th scope="col" className={cn(th, 'text-right')}>
              KM
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={cn(th, 'text-center')}>
              Featured
            </th>
            <th scope="col" className={th}>
              Created
            </th>
            <th scope="col" className={th}>
              Updated
            </th>
            <th scope="col" className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cars.map((car) => (
            <tr key={car.id} className="transition-colors hover:bg-canvas">
              <td className={td}>
                <Thumbnail car={car} className="w-16" />
              </td>
              <td className={cn(td, 'max-w-64')}>
                <VehicleName car={car} />
              </td>
              <td className={cn(td, 'text-right font-semibold whitespace-nowrap text-navy tabular-nums')}>
                {formatPriceLakh(car.price)}
              </td>
              <td className={cn(td, 'tabular-nums')}>{car.year}</td>
              <td className={cn(td, 'text-right font-semibold whitespace-nowrap tabular-nums')}>
                {formatKm(car.kmsDriven)}
              </td>
              <td className={td}>
                <CarStatusBadge status={car.status} />
              </td>
              <td className={cn(td, 'text-center')}>
                <Featured featured={car.featured} />
              </td>
              <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDate(car.createdAt)}</td>
              <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDate(car.updatedAt)}</td>
              <td className={td}>
                <CarRowActions car={rowActionsCar(car)} className="justify-end" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function InventoryCard({ car }: { car: InventoryCar }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Thumbnail car={car} className="w-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <VehicleName car={car} />
          <p className="text-body-sm text-muted">
            <span className="text-label-lg text-navy">{formatPriceLakh(car.price)}</span> ·{' '}
            <span className="font-semibold text-chip-ink">{formatKm(car.kmsDriven)}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CarStatusBadge status={car.status} />
        {car.featured && (
          <span className="inline-flex items-center gap-1 text-label-md text-chip-ink">
            <StarIcon width={14} height={14} fill="currentColor" className="text-highlight" />
            Featured
          </span>
        )}
        <span className="text-body-sm text-muted">Updated {formatDate(car.updatedAt)}</span>
      </div>
      <CarRowActions car={rowActionsCar(car)} className="border-t border-border pt-3 [&>a]:flex-1" />
    </Card>
  );
}
