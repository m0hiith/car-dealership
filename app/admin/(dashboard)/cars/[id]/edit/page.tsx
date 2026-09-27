import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CarForm } from '@/components/admin/car-form/car-form';
import { AdminPageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getCarForEdit, getCarFormOptions } from '@/lib/queries/admin-cars';
import { carIdSchema } from '@/lib/validation/car';

export const metadata: Metadata = { title: 'Edit car' };

export default async function EditCarPage({ params }: PageProps<'/admin/cars/[id]/edit'>) {
  await requireAdmin();
  const id = carIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const [car, options] = await Promise.all([getCarForEdit(id.data), getCarFormOptions()]);
  if (!car) notFound();

  const brand = options.brands.find((b) => b.id === car.brandId)?.name;
  const model = options.models.find((m) => m.id === car.modelId)?.name;
  const title = [car.year, brand, model].filter(Boolean).join(' ');
  const dates = [
    car.publishedAt && `First published ${formatDate(car.publishedAt)}`,
    car.soldAt && `Sold ${formatDate(car.soldAt)}`,
    `Last updated ${formatDate(car.updatedAt)}`,
  ].filter(Boolean);

  return (
    <>
      <AdminPageHeader title={title || 'Edit car'} description={dates.join(' · ')} />
      <CarForm carId={car.id} car={car} options={options} />
    </>
  );
}
