import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBrowseOptions } from '@/lib/queries/homepage';
import { getLandingPage, getLandingPages } from '@/lib/queries/landing';
import { getSiteSettings } from '@/lib/queries/settings';
import { landingHeading, landingIntro, landingPath, pageMetadata, type Landing } from '@/lib/seo';

/** Shared by /used-cars-hyderabad and /used-cars/[segment]: data, or a 404 when nothing matches. */
export async function loadLanding(landing: Landing) {
  const [page, settings, pages, browse] = await Promise.all([
    getLandingPage(landing),
    getSiteSettings(),
    getLandingPages(),
    getBrowseOptions(),
  ]);
  if (!page) notFound();
  const path = landingPath(landing);
  const related = pages.map((p) => p.landing).filter((l) => landingPath(l) !== path);
  const brandNames = new Map(browse.brands.map((b) => [b.slug, b.name]));
  return { page, settings, related, brandNames };
}

export async function landingMetadata(landing: Landing): Promise<Metadata> {
  const [page, settings] = await Promise.all([getLandingPage(landing), getSiteSettings()]);
  if (!page) return { robots: { index: false } };
  const intro = landingIntro(landing, page.stats, settings.dealershipName, page.brandName);
  return pageMetadata({
    title: landingHeading(landing, page.brandName),
    description: intro.length > 160 ? `${intro.slice(0, 157).replace(/\s+\S*$/, '')}…` : intro,
    path: landingPath(landing),
    siteName: settings.dealershipName,
    image: page.cars[0]?.coverUrl ?? settings.logoUrl,
  });
}
