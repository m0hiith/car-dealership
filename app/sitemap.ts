import type { MetadataRoute } from 'next';
import { getLandingPages } from '@/lib/queries/landing';
import { getSitemapCars } from '@/lib/queries/sitemap';
import { landingPath } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

/**
 * Static pages, every generated landing page with stock (/used-cars-hyderabad,
 * /used-cars/...), and every published or reserved car (PRODUCT_SPEC §14).
 * Drafts, sold and archived cars and /admin are never listed. The filterable
 * /cars/brand and /cars/type listings are left out: their canonical is the
 * matching landing page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, landings] = await Promise.all([getSitemapCars(), getLandingPages()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/cars'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/sell'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/contact'), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const landingPages: MetadataRoute.Sitemap = landings.map(({ landing }) => ({
    url: absoluteUrl(landingPath(landing)),
    changeFrequency: 'daily',
    priority: landing.kind === 'all' ? 0.9 : 0.7,
  }));

  const carPages: MetadataRoute.Sitemap = cars.map((car) => ({
    url: absoluteUrl(`/cars/${car.slug}`),
    lastModified: car.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...landingPages, ...carPages];
}
