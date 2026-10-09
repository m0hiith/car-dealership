import { describe, expect, it } from 'vitest';
import {
  breadcrumbJsonLd,
  carImageAlt,
  carSeoTitle,
  isRecentlySold,
  landingHeading,
  landingIntro,
  landingPath,
  pageMetadata,
  parseLandingSegment,
} from '@/lib/seo';

describe('carSeoTitle', () => {
  it('appends fuel and gearbox when the variant does not already say them', () => {
    expect(
      carSeoTitle({
        name: '2022 Hyundai Creta SX',
        variant: 'SX',
        fuelType: 'petrol',
        transmission: 'torque_converter',
      }),
    ).toBe('2022 Hyundai Creta SX Petrol Automatic for Sale in Hyderabad');
    expect(
      carSeoTitle({
        name: '2020 Maruti Suzuki Swift ZXi Plus',
        variant: 'ZXi Plus',
        fuelType: 'petrol',
        transmission: 'manual',
      }),
    ).toBe('2020 Maruti Suzuki Swift ZXi Plus Petrol Manual for Sale in Hyderabad');
  });

  it('does not repeat fuel or gearbox words already in an Indian trim name', () => {
    expect(
      carSeoTitle({
        name: '2021 Hyundai Creta SX (O) 1.5 Diesel AT',
        variant: 'SX (O) 1.5 Diesel AT',
        fuelType: 'diesel',
        transmission: 'torque_converter',
      }),
    ).toBe('2021 Hyundai Creta SX (O) 1.5 Diesel AT for Sale in Hyderabad');
  });

  it('adds only the missing half when the variant names just one of them', () => {
    expect(
      carSeoTitle({
        name: '2022 Tata Nexon XZ Plus Petrol',
        variant: 'XZ Plus Petrol',
        fuelType: 'petrol',
        transmission: 'manual',
      }),
    ).toBe('2022 Tata Nexon XZ Plus Petrol Manual for Sale in Hyderabad');
    expect(
      carSeoTitle({ name: '2019 Honda City VX CVT', variant: 'VX CVT', fuelType: 'petrol', transmission: 'cvt' }),
    ).toBe('2019 Honda City VX CVT Petrol for Sale in Hyderabad');
  });

  it('works with no variant at all', () => {
    expect(carSeoTitle({ name: '2022 Kia Seltos', variant: null, fuelType: 'diesel', transmission: 'manual' })).toBe(
      '2022 Kia Seltos Diesel Manual for Sale in Hyderabad',
    );
  });
});

describe('landing pages', () => {
  it.each([
    ['suv', { kind: 'body', bodyType: 'suv' }],
    ['luxury', { kind: 'body', bodyType: 'luxury' }],
    ['under-5-lakh', { kind: 'budget', lakh: 5 }],
    ['under-50-lakh', { kind: 'budget', lakh: 50 }],
    ['hyundai', { kind: 'brand', slug: 'hyundai' }],
    ['maruti-suzuki', { kind: 'brand', slug: 'maruti-suzuki' }],
  ] as const)('parses /used-cars/%s', (segment, expected) => {
    expect(parseLandingSegment(segment)).toEqual(expected);
    expect(landingPath(expected)).toBe(`/used-cars/${segment}`);
  });

  it.each(['under-7-lakh', 'under-abc-lakh', 'Hyundai', '../admin', 'a'.repeat(81)])('rejects %s', (segment) => {
    expect(parseLandingSegment(segment)).toBeNull();
  });

  it('writes a distinct heading per page', () => {
    expect(landingHeading({ kind: 'all' })).toBe('Used Cars in Hyderabad');
    expect(landingHeading({ kind: 'brand', slug: 'hyundai' }, 'Hyundai')).toBe('Used Hyundai Cars in Hyderabad');
    expect(landingHeading({ kind: 'body', bodyType: 'suv' })).toBe('Used SUVs in Hyderabad');
    expect(landingHeading({ kind: 'body', bodyType: 'luxury' })).toBe('Used Luxury Cars in Hyderabad');
    expect(landingHeading({ kind: 'budget', lakh: 5 })).toBe('Used Cars Under ₹5 Lakh in Hyderabad');
  });

  it('writes the intro from live stock', () => {
    const stats = {
      total: 12,
      minPrice: 350_000,
      maxPrice: 1_525_000,
      brands: ['Hyundai', 'Maruti Suzuki', 'Tata', 'Kia'],
      models: ['Creta', 'Venue'],
      bodyTypes: ['suv' as const],
    };
    expect(landingIntro({ kind: 'all' }, stats, 'Test Motors')).toBe(
      'Browse 12 pre-owned cars in stock at Test Motors in Hyderabad, priced from ₹3.5 Lakh to ₹15.25 Lakh, from brands including Hyundai, Maruti Suzuki and Tata. Each listing shows the price, kilometres, ownership and photos, and you can send an enquiry from any car.',
    );
    expect(landingIntro({ kind: 'body', bodyType: 'suv' }, { ...stats, total: 1, maxPrice: 350_000 }, '')).toMatch(
      /^1 used SUV in stock in Hyderabad, priced at ₹3\.5 Lakh, from Hyundai, Maruti Suzuki and Tata\./,
    );
    expect(landingIntro({ kind: 'brand', slug: 'hyundai' }, stats, 'Test Motors', 'Hyundai')).toContain(
      'Models available now: Creta and Venue',
    );
  });
});

describe('pageMetadata', () => {
  it('sets canonical, Open Graph and Twitter together', () => {
    const meta = pageMetadata({
      title: 'Used Cars in Hyderabad',
      description: 'd',
      path: '/used-cars-hyderabad',
      siteName: 'Test Motors',
      image: 'https://x.test/a.webp',
    });
    expect(meta.alternates?.canonical).toBe('/used-cars-hyderabad');
    expect(meta.openGraph).toMatchObject({
      title: 'Used Cars in Hyderabad | Test Motors',
      siteName: 'Test Motors',
      locale: 'en_IN',
      url: '/used-cars-hyderabad',
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(meta.robots).toBeUndefined();
  });

  it('can be noindex and uses a small card without an image', () => {
    const meta = pageMetadata({ title: 't', description: 'd', path: '/x', siteName: 'S', noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.twitter).toMatchObject({ card: 'summary' });
  });
});

describe('structured data and helpers', () => {
  it('numbers breadcrumbs with absolute URLs', () => {
    const data = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Used cars', path: '/cars' },
    ]);
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[1]).toMatchObject({ position: 2, name: 'Used cars' });
    expect(data.itemListElement[1]!.item).toMatch(/^https?:\/\/.+\/cars$/);
  });

  it('keeps a sold car page live for 30 days', () => {
    const now = Date.parse('2026-10-07T12:00:00Z');
    expect(isRecentlySold('2026-09-20T12:00:00Z', now)).toBe(true);
    expect(isRecentlySold('2026-09-06T12:00:00Z', now)).toBe(false);
    expect(isRecentlySold(null, now)).toBe(false);
  });

  it('builds alt text from car data', () => {
    const car = { name: '2022 Hyundai Creta SX', fuelType: 'petrol', transmission: 'cvt', colour: 'White' } as const;
    expect(carImageAlt(car)).toBe('2022 Hyundai Creta SX, Petrol, Automatic, White');
    expect(carImageAlt(car, { index: 1, total: 8 })).toBe(
      '2022 Hyundai Creta SX, Petrol, Automatic, White, photo 2 of 8',
    );
  });
});
