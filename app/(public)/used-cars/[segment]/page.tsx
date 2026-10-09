import { notFound } from 'next/navigation';
import { LandingView } from '@/components/landing/landing-view';
import { landingMetadata, loadLanding } from '@/lib/landing-page';
import { parseLandingSegment } from '@/lib/seo';

// Rendered on first visit, then cached until stock changes (cars tag).
export const revalidate = 3600;

export function generateStaticParams(): { segment: string }[] {
  return [];
}

async function readLanding(params: Promise<{ segment: string }>) {
  const landing = parseLandingSegment((await params).segment);
  if (!landing) notFound();
  return landing;
}

export async function generateMetadata({ params }: PageProps<'/used-cars/[segment]'>) {
  return landingMetadata(await readLanding(params));
}

/**
 * /used-cars/hyundai, /used-cars/suv, /used-cars/under-5-lakh: generated from
 * inventory. A page only exists while at least one car matches; otherwise 404.
 */
export default async function UsedCarsSegmentPage({ params }: PageProps<'/used-cars/[segment]'>) {
  const landing = await readLanding(params);
  const { page, settings, related, brandNames } = await loadLanding(landing);
  return (
    <LandingView
      landing={landing}
      page={page}
      dealershipName={settings.dealershipName}
      related={related}
      brandNames={brandNames}
    />
  );
}
