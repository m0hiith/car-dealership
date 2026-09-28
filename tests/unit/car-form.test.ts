import { describe, expect, it } from 'vitest';
import { airbagsFeature, parseAirbagsFeature } from '@/lib/car-options';
import { canMoveTo } from '@/lib/car-status';
import { buildCarSlug, carSlugCandidates, randomSlugCode, slugify, withSlugTail } from '@/lib/slug';
import { carFieldErrors, carSaveSchema, photoFileSchema, type CarSaveInput } from '@/lib/validation/car';

describe('slugify', () => {
  it.each([
    ['Mercedes-Benz GLA 200 d', 'mercedes-benz-gla-200-d'],
    ['  Škoda   Octavia ', 'skoda-octavia'],
    ['Grand i10 Nios', 'grand-i10-nios'],
    ['1.2 VXi (O)', '1-2-vxi-o'],
    ['A & B', 'a-and-b'],
    ['---', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('buildCarSlug', () => {
  it('builds the spec example', () => {
    expect(
      buildCarSlug({
        year: 2022,
        brand: 'Hyundai',
        model: 'Creta',
        variant: 'SX',
        fuelType: 'petrol',
        transmission: 'torque_converter',
      }),
    ).toBe('2022-hyundai-creta-sx-petrol-automatic');
  });

  it('does not repeat fuel or gearbox already in the variant', () => {
    expect(
      buildCarSlug({
        year: 2021,
        brand: 'Maruti Suzuki',
        model: 'Swift',
        variant: 'VXi Petrol Manual',
        fuelType: 'petrol',
        transmission: 'manual',
      }),
    ).toBe('2021-maruti-suzuki-swift-vxi-petrol-manual');
  });

  it('works with partial details', () => {
    expect(buildCarSlug({ brand: 'BMW', model: 'X1' })).toBe('bmw-x1');
    expect(buildCarSlug({})).toBe('');
  });

  it('stays within 120 characters without a trailing hyphen', () => {
    const slug = buildCarSlug({ brand: 'Brand', model: 'Model', variant: 'very long variant name '.repeat(10) });
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('carSlugCandidates', () => {
  it('tries the details alone, then with the colour, never a number', () => {
    expect(carSlugCandidates('2021-maruti-suzuki-swift-vxi-petrol-manual', 'Pearl White')).toEqual([
      '2021-maruti-suzuki-swift-vxi-petrol-manual',
      '2021-maruti-suzuki-swift-vxi-petrol-manual-pearl-white',
    ]);
    expect(carSlugCandidates('2023-bmw-x1', null)).toEqual(['2023-bmw-x1']);
    expect(carSlugCandidates('2023-bmw-x1', ' ')).toEqual(['2023-bmw-x1']);
  });
});

describe('withSlugTail', () => {
  it('appends and keeps the length limit', () => {
    expect(withSlugTail('2023-bmw-x1', 'red')).toBe('2023-bmw-x1-red');
    const long = 'a'.repeat(120);
    expect(withSlugTail(long, 'k7p2')).toHaveLength(120);
    expect(withSlugTail(long, 'k7p2').endsWith('-k7p2')).toBe(true);
  });
});

describe('randomSlugCode', () => {
  it('is 4 easy-to-read characters', () => {
    for (let i = 0; i < 50; i++) expect(randomSlugCode()).toMatch(/^[a-hjkmnp-z2-9]{4}$/);
    expect(randomSlugCode(() => 0)).toBe('aaaa');
    expect(randomSlugCode(() => 0.9999)).toBe('9999');
  });
});

describe('canMoveTo', () => {
  it('lets a new car be saved as a draft or published only', () => {
    expect(canMoveTo(null, 'draft')).toBe(true);
    expect(canMoveTo(null, 'published')).toBe(true);
    expect(canMoveTo(null, 'sold')).toBe(false);
  });

  it('follows the status flow', () => {
    expect(canMoveTo('draft', 'sold')).toBe(false);
    expect(canMoveTo('published', 'sold')).toBe(true);
    expect(canMoveTo('reserved', 'published')).toBe(true);
    expect(canMoveTo('sold', 'draft')).toBe(false);
    expect(canMoveTo('archived', 'published')).toBe(false);
    expect(canMoveTo('archived', 'draft')).toBe(true);
  });
});

describe('airbags feature', () => {
  it('round-trips', () => {
    expect(airbagsFeature(6)).toBe('6 Airbags');
    expect(airbagsFeature(1)).toBe('1 Airbag');
    expect(parseAirbagsFeature('6 Airbags')).toBe(6);
    expect(parseAirbagsFeature('1 Airbag')).toBe(1);
    expect(parseAirbagsFeature('Sunroof')).toBeNull();
  });
});

const carId = '4f6c1b0e-6f4b-4c2e-9d57-2d6f0b3a9c11';
const photo = `${carId}/0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b.webp`;

function validCar(overrides: Partial<CarSaveInput> = {}): CarSaveInput {
  return {
    id: carId,
    status: 'published',
    brandId: '9b2e8c1a-1d2f-4a3b-8c4d-5e6f7a8b9c0d',
    modelId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    variant: 'sDrive18i',
    price: 4_200_000,
    originalPrice: null,
    year: 2023,
    kmsDriven: 28_000,
    fuelType: 'petrol',
    transmission: 'automatic',
    bodyType: 'luxury',
    engineCc: null,
    owners: 1,
    color: '',
    registrationState: 'TS',
    registrationCity: 'Hyderabad',
    description: '',
    featured: false,
    features: ['Sunroof', 'sunroof', ' Reverse Camera '],
    photos: [photo],
    ...overrides,
  };
}

describe('carSaveSchema', () => {
  it('accepts the acceptance-test BMW X1 and cleans optional fields', () => {
    const result = carSaveSchema.safeParse(validCar());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.color).toBeNull();
    expect(result.data.description).toBeNull();
    expect(result.data.features).toEqual(['Sunroof', 'Reverse Camera']);
  });

  it('requires a photo to publish but not to save a draft', () => {
    const published = carSaveSchema.safeParse(validCar({ photos: [] }));
    expect(published.success).toBe(false);
    if (!published.success) expect(carFieldErrors(published.error).photos).toMatch(/at least one photo/);

    expect(carSaveSchema.safeParse(validCar({ status: 'draft', photos: [] })).success).toBe(true);
  });

  it('reports missing required fields with friendly messages', () => {
    const result = carSaveSchema.safeParse(
      validCar({
        brandId: '',
        price: Number.NaN,
        year: Number.NaN,
        fuelType: '' as never,
        status: 'draft',
      }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = carFieldErrors(result.error);
    expect(errors.brandId).toBe('Choose a brand.');
    expect(errors.price).toBe('Enter the selling price in rupees.');
    expect(errors.year).toBe('Choose the year.');
    expect(errors.fuelType).toBe('Choose the fuel type.');
  });

  it('rejects an original price at or below the selling price', () => {
    const result = carSaveSchema.safeParse(validCar({ originalPrice: 4_000_000 }));
    expect(result.success).toBe(false);
  });

  it("rejects another car's photo paths", () => {
    const other = '11111111-2222-4333-8444-555555555555/0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b.webp';
    expect(carSaveSchema.safeParse(validCar({ photos: [other] })).success).toBe(false);
  });
});

describe('photoFileSchema', () => {
  it.each([
    [{ name: 'a.jpg', type: 'image/jpeg', size: 4_000_000 }, true],
    [{ name: 'IMG_0001.HEIC', type: '', size: 3_000_000 }, true],
    [{ name: 'IMG_0001.heic', type: 'image/heic', size: 3_000_000 }, true],
    [{ name: 'doc.pdf', type: 'application/pdf', size: 1000 }, false],
    [{ name: 'huge.jpg', type: 'image/jpeg', size: 31 * 1024 * 1024 }, false],
    [{ name: 'empty.png', type: 'image/png', size: 0 }, false],
  ])('%o -> %s', (file, ok) => {
    expect(photoFileSchema.safeParse(file).success).toBe(ok);
  });
});
