import { CarGridSkeleton } from '@/components/cars/car-grid';
import { Skeleton } from '@/components/ui';

/**
 * First load of /cars. Filter changes after that show skeletons in place
 * (ListingResults). Brand and type pages have no loading.tsx on purpose: a
 * streamed response cannot switch to a 404 status for an unknown slug.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 md:px-6 md:py-8" aria-busy>
      <span className="sr-only">Loading cars…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <Skeleton className="hidden h-[32rem] rounded-card lg:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-11 md:hidden" />
          <CarGridSkeleton />
        </div>
      </div>
    </div>
  );
}
