import { describe, expect, it } from 'vitest';
import {
  buildCarSlug,
  carSlugCandidates,
  randomSlugCode,
  slugify,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  withSlugTail,
} from '@/lib/slug';

describe('slugify', () => {
  it('lowercases, replaces punctuation with hyphens and trims edges', () => {
    expect(slugify('Mercedes-Benz GLA 200 d')).toBe('mercedes-benz-gla-200-d');
    expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing');
    expect(slugify('SX (O) 1.5 Diesel AT')).toBe('sx-o-1-5-diesel-at');
  });

  it('spells out "&" instead of dropping it', () => {
    expect(slugify('Black & White')).toBe('black-and-white');
  });

  it('strips accents', () => {
    expect(slugify('Škoda Octavia')).toBe('skoda-octavia');
  });

  it('collapses repeated separators into one hyphen', () => {
    expect(slugify('A---B__C')).toBe('a-b-c');
  });

  it('always produces SLUG_PATTERN-valid output', () => {
    expect(SLUG_PATTERN.test(slugify('2022 Hyundai Creta SX (O)!!'))).toBe(true);
  });
});

describe('buildCarSlug', () => {
  it('joins year, brand, model and variant', () => {
    expect(buildCarSlug({ year: 2022, brand: 'Hyundai', model: 'Creta', variant: 'SX' })).toBe(
      '2022-hyundai-creta-sx',
    );
  });

  it('appends fuel and gearbox when the variant does not already say them', () => {
    expect(
      buildCarSlug({ year: 2020, brand: 'Maruti Suzuki', model: 'Swift', variant: 'ZXi Plus', fuelType: 'petrol', transmission: 'manual' }),
    ).toBe('2020-maruti-suzuki-swift-zxi-plus-petrol-manual');
  });

  it('does not repeat fuel or gearbox words already in the variant', () => {
    expect(
      buildCarSlug({
        year: 2021,
        brand: 'Hyundai',
        model: 'Creta',
        variant: 'SX (O) 1.5 Diesel AT',
        fuelType: 'diesel',
        transmission: 'torque_converter',
      }),
    ).toBe('2021-hyundai-creta-sx-o-1-5-diesel-at');
  });

  it('treats cvt/amt/dct as automatic', () => {
    expect(buildCarSlug({ year: 2019, brand: 'Honda', model: 'City', variant: 'VX', transmission: 'cvt' })).toBe(
      '2019-honda-city-vx-automatic',
    );
  });

  it('clamps to SLUG_MAX_LENGTH without a trailing hyphen', () => {
    const slug = buildCarSlug({ year: 2022, brand: 'A'.repeat(150), model: 'Model' });
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('skips missing parts cleanly', () => {
    expect(buildCarSlug({ year: 2022, brand: 'Kia' })).toBe('2022-kia');
  });
});

describe('withSlugTail', () => {
  it('appends the tail', () => {
    expect(withSlugTail('2022-hyundai-creta', 'red')).toBe('2022-hyundai-creta-red');
  });

  it('clamps the base so the tagged slug still fits SLUG_MAX_LENGTH', () => {
    const long = 'a'.repeat(SLUG_MAX_LENGTH);
    const tagged = withSlugTail(long, 'red');
    expect(tagged.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(tagged.endsWith('-red')).toBe(true);
  });
});

describe('carSlugCandidates', () => {
  it('offers the base slug first, then the base with the colour appended', () => {
    expect(carSlugCandidates('2022-hyundai-creta-sx', 'Polar White')).toEqual([
      '2022-hyundai-creta-sx',
      '2022-hyundai-creta-sx-polar-white',
    ]);
  });

  it('skips the colour candidate with no colour', () => {
    expect(carSlugCandidates('2022-hyundai-creta-sx')).toEqual(['2022-hyundai-creta-sx']);
  });

  it('does not duplicate a colour the base already ends with', () => {
    expect(carSlugCandidates('2022-hyundai-creta-sx-red', 'Red')).toEqual(['2022-hyundai-creta-sx-red']);
  });
});

describe('randomSlugCode', () => {
  it('is four characters from the unambiguous alphabet (no 0/o/1/l/i)', () => {
    const code = randomSlugCode();
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{4}$/);
  });

  it('is deterministic given a fixed random source', () => {
    const fixed = () => 0;
    expect(randomSlugCode(fixed)).toBe('aaaa');
  });
});
