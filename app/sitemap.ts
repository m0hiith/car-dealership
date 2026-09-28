import type { MetadataRoute } from 'next';
import { BODY_TYPES } from '@/lib/car-options';
import { getBrowseOptions } from '@/lib/queries/homepage';
import { getSitemapCars } from '@/lib/queries/sitemap';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

/**
 * Static pages, every brand and body-type page with stock, and every
 * published or reserved car (PRODUCT_SPEC §14). Draft, sold and archived
 * cars are never indexable, so they are never listed here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, browse] = await Promise.all([getSitemapCars(), getBrowseOptions()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/cars'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/contact'), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const brandPages: MetadataRoute.Sitemap = browse.brands
    .filter((brand) => brand.count > 0)
    .map((brand) => ({ url: absoluteUrl(`/cars/brand/${brand.slug}`), changeFrequency: 'daily', priority: 0.7 }));

  const bodyTypePages: MetadataRoute.Sitemap = BODY_TYPES.filter((type) => browse.bodyTypeCounts[type] > 0).map(
    (type) => ({ url: absoluteUrl(`/cars/type/${type}`), changeFrequency: 'daily', priority: 0.7 }),
  );

  const carPages: MetadataRoute.Sitemap = cars.map((car) => ({
    url: absoluteUrl(`/cars/${car.slug}`),
    lastModified: car.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...brandPages, ...bodyTypePages, ...carPages];
}
