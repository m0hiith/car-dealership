import { LandingView } from '@/components/landing/landing-view';
import { landingMetadata, loadLanding } from '@/lib/landing-page';
import type { Landing } from '@/lib/seo';

// Rendered on first visit, then cached until stock changes (cars tag).
export const revalidate = 3600;

const LANDING: Landing = { kind: 'all' };

export function generateMetadata() {
  return landingMetadata(LANDING);
}

/** "Used Cars in Hyderabad": every car in stock, generated from inventory. */
export default async function UsedCarsHyderabadPage() {
  const { page, settings, related, brandNames } = await loadLanding(LANDING);
  return (
    <LandingView
      landing={LANDING}
      page={page}
      dealershipName={settings.dealershipName}
      related={related}
      brandNames={brandNames}
    />
  );
}
