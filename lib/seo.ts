import type { Metadata } from 'next';
import {
  BODY_TYPES,
  FUEL_LABELS,
  isAutomatic,
  type BodyType,
  type FuelType,
  type Transmission,
} from '@/lib/car-options';
import { formatPriceLakh } from '@/lib/format';
import { absoluteUrl } from '@/lib/site-url';
import { SLUG_PATTERN } from '@/lib/slug';

/**
 * Search: page metadata, generated landing pages and JSON-LD helpers. The
 * dealership sells from Hyderabad, so titles and landing pages say so; the
 * car's own registration city is a spec, not where it is for sale.
 */
export const SEO_CITY = 'Hyderabad';

/** How long a sold car's page stays live and indexable before it answers 410 Gone. */
export const SOLD_PAGE_DAYS = 30;

export function isRecentlySold(soldAt: string | null, now: number): boolean {
  if (!soldAt) return false;
  const sold = Date.parse(soldAt);
  return Number.isFinite(sold) && now - sold < SOLD_PAGE_DAYS * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------

/**
 * Title, description, canonical, Open Graph and Twitter card for a public
 * page. A page's openGraph replaces the layout's rather than merging with
 * it, so site name and locale are set here every time.
 */
export function pageMetadata({
  title,
  description,
  path,
  siteName,
  image,
  absoluteTitle = false,
  noindex = false,
}: {
  title: string;
  description: string;
  /** Canonical path, e.g. "/cars/2022-hyundai-creta-sx". */
  path: string;
  siteName: string;
  image?: string | null;
  /** Use the title as given, without the layout's "| Dealer" suffix. */
  absoluteTitle?: boolean;
  noindex?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle || !siteName ? title : `${title} | ${siteName}`;
  const images = image ? [{ url: image }] : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName, locale: 'en_IN', type: 'website', images },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: fullTitle, description, images },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------

const GEARBOX_WORD_PATTERN = /\b(AT|MT|CVT|AMT|DCT|IVT|Automatic|Manual)\b/i;

/**
 * "2022 Hyundai Creta SX Petrol Automatic for Sale in Hyderabad". Indian trim
 * names often already say the fuel or gearbox ("SX (O) 1.5 Diesel AT"), so
 * those words are not repeated.
 */
export function carSeoTitle({
  name,
  variant,
  fuelType,
  transmission,
}: {
  /** Year, brand, model and variant: "2022 Hyundai Creta SX". */
  name: string;
  variant: string | null;
  fuelType: FuelType;
  transmission: Transmission;
}): string {
  const fuel = FUEL_LABELS[fuelType];
  const gearbox = isAutomatic(transmission) ? 'Automatic' : 'Manual';
  const hasFuel = variant ? new RegExp(`\\b${fuel}\\b`, 'i').test(variant) : false;
  const hasGearbox = variant ? GEARBOX_WORD_PATTERN.test(variant) : false;
  const suffix = [!hasFuel && fuel, !hasGearbox && gearbox].filter((part): part is string => Boolean(part));
  return `${[name, ...suffix].join(' ')} for Sale in ${SEO_CITY}`;
}

/**
 * Alt text for a car photo, from the car's data: "2022 Hyundai Creta SX,
 * Petrol, Automatic, White". With `photo`, adds "photo 2 of 8".
 */
export function carImageAlt(
  car: { name: string; fuelType: FuelType; transmission: Transmission; colour?: string | null },
  photo?: { index: number; total: number },
): string {
  const parts = [car.name, FUEL_LABELS[car.fuelType], isAutomatic(car.transmission) ? 'Automatic' : 'Manual'];
  if (car.colour) parts.push(car.colour);
  const base = parts.join(', ');
  return photo && photo.total > 1 ? `${base}, photo ${photo.index + 1} of ${photo.total}` : base;
}

// ---------------------------------------------------------------------------
// Landing pages: /used-cars-hyderabad and /used-cars/[segment]
// ---------------------------------------------------------------------------

/** "Under ₹X Lakh" pages that may exist; each only when stock is under it. */
export const PRICE_CEILINGS_LAKH = [3, 5, 8, 10, 15, 20, 30, 50] as const;

export type Landing =
  | { kind: 'all' }
  | { kind: 'brand'; slug: string }
  | { kind: 'body'; bodyType: BodyType }
  | { kind: 'budget'; lakh: (typeof PRICE_CEILINGS_LAKH)[number] };

/** The landing page a /used-cars/[segment] URL asks for, or null for an unknown or malformed segment. */
export function parseLandingSegment(segment: string): Landing | null {
  // Anything shaped like a budget URL is judged as one, never as a brand.
  if (/^under-.*-lakh$/.test(segment)) {
    const lakh = Number(/^under-(\d{1,3})-lakh$/.exec(segment)?.[1]);
    const ceiling = PRICE_CEILINGS_LAKH.find((c) => c === lakh);
    return ceiling ? { kind: 'budget', lakh: ceiling } : null;
  }
  if ((BODY_TYPES as readonly string[]).includes(segment)) return { kind: 'body', bodyType: segment as BodyType };
  if (segment.length <= 80 && SLUG_PATTERN.test(segment)) return { kind: 'brand', slug: segment };
  return null;
}

export function landingPath(landing: Landing): string {
  switch (landing.kind) {
    case 'all':
      return '/used-cars-hyderabad';
    case 'brand':
      return `/used-cars/${landing.slug}`;
    case 'body':
      return `/used-cars/${landing.bodyType}`;
    case 'budget':
      return `/used-cars/under-${landing.lakh}-lakh`;
  }
}

/** Plural body-type names for headings: "SUVs", "Luxury Cars". */
const BODY_TYPE_PLURALS: Record<BodyType, string> = {
  hatchback: 'Hatchbacks',
  sedan: 'Sedans',
  suv: 'SUVs',
  muv: 'MUVs',
  coupe: 'Coupes',
  convertible: 'Convertibles',
  luxury: 'Luxury Cars',
};

/** Body types inside a sentence: [singular, plural]. */
const BODY_TYPE_NOUNS: Record<BodyType, [string, string]> = {
  hatchback: ['hatchback', 'hatchbacks'],
  sedan: ['sedan', 'sedans'],
  suv: ['SUV', 'SUVs'],
  muv: ['MUV', 'MUVs'],
  coupe: ['coupe', 'coupes'],
  convertible: ['convertible', 'convertibles'],
  luxury: ['luxury car', 'luxury cars'],
};

/** What a landing page is about, for its H1 and title: "Used SUVs in Hyderabad". */
export function landingHeading(landing: Landing, brandName?: string): string {
  switch (landing.kind) {
    case 'all':
      return `Used Cars in ${SEO_CITY}`;
    case 'brand':
      return `Used ${brandName ?? 'Brand'} Cars in ${SEO_CITY}`;
    case 'body':
      return `Used ${BODY_TYPE_PLURALS[landing.bodyType]} in ${SEO_CITY}`;
    case 'budget':
      return `Used Cars Under ₹${landing.lakh} Lakh in ${SEO_CITY}`;
  }
}

export type LandingStats = {
  total: number;
  minPrice: number;
  maxPrice: number;
  /** Most common first. */
  brands: string[];
  models: string[];
  bodyTypes: BodyType[];
};

/** "A, B and C" */
function list(items: string[], max = 3): string {
  const shown = items.slice(0, max);
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
}

/**
 * The intro paragraph under the H1, written from live stock so every page
 * says something specific and true. No promises beyond the data.
 */
export function landingIntro(landing: Landing, stats: LandingStats, dealer: string, brandName?: string): string {
  const cars = stats.total === 1 ? 'car' : 'cars';
  const at = dealer ? ` at ${dealer}` : '';
  const range =
    stats.minPrice === stats.maxPrice
      ? `priced at ${formatPriceLakh(stats.minPrice)}`
      : `priced from ${formatPriceLakh(stats.minPrice)} to ${formatPriceLakh(stats.maxPrice)}`;
  const close =
    'Each listing shows the price, kilometres, ownership and photos, and you can send an enquiry from any car.';

  switch (landing.kind) {
    case 'all':
      return `Browse ${stats.total} pre-owned ${cars} in stock${at} in ${SEO_CITY}, ${range}${
        stats.brands.length ? `, from brands including ${list(stats.brands)}` : ''
      }. ${close}`;
    case 'brand':
      return `${stats.total} used ${brandName ?? ''} ${cars} in stock${at} in ${SEO_CITY}, ${range}${
        stats.models.length ? `. Models available now: ${list(stats.models, 4)}` : ''
      }. ${close}`;
    case 'body': {
      const [one, many] = BODY_TYPE_NOUNS[landing.bodyType];
      return `${stats.total} used ${stats.total === 1 ? one : many} in stock${at} in ${SEO_CITY}, ${range}${
        stats.brands.length ? `, from ${list(stats.brands)}` : ''
      }. ${close}`;
    }
    case 'budget':
      return `${stats.total} used ${cars} under ₹${landing.lakh} Lakh in stock${at} in ${SEO_CITY}, ${range}${
        stats.brands.length ? `, from brands including ${list(stats.brands)}` : ''
      }. ${close}`;
  }
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it cannot close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
