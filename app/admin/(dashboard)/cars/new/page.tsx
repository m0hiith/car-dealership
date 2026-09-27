import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import { CarForm } from '@/components/admin/car-form/car-form';
import { AdminPageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { getCarFormOptions } from '@/lib/queries/admin-cars';

export const metadata: Metadata = { title: 'Add car' };

export default async function NewCarPage() {
  await requireAdmin();
  const options = await getCarFormOptions();

  return (
    <>
      <AdminPageHeader title="Add car" description="Fill in the details, add photos, then publish." />
      {/* The id is fixed before the first save so photos can be uploaded to car-images/{id}/ straight away. */}
      <CarForm carId={randomUUID()} car={null} options={options} />
    </>
  );
}
