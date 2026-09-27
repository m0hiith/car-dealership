import { describe, expect, it } from 'vitest';
import { carBadges, isNewArrival } from '@/lib/car-badges';
import { telHref, whatsappHref } from '@/lib/contact';
import {
  activeFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  listingHref,
  parseListingState,
  priceLabel,
  toRpcFilters,
  withoutBrand,
  yearOptions,
} from '@/lib/validation/public-cars';

describe('parseListingState', () => {
  it('defaults to no filters, newest, page 1', () => {
    expect(parseListingState({})).toEqual({ filters: EMPTY_FILTERS, sort: 'newest', page: 1 });
  });

  it('reads comma-separated and repeated lists, dropping invalid and duplicate values', () => {
    const { filters } = parseListingState({
      brand: 'bmw,hyundai,BMW!,bmw',
      fuel: ['petrol,steam', 'diesel'],
      transmission: 'automatic,cvt',
      body: 'suv,boat',
      owners: '1,3,4,x',
      colour: 'Pearl White,red,<script>',
    });
    expect(filters.brands).toEqual(['bmw', 'hyundai']);
    expect(filters.fuels).toEqual(['petrol', 'diesel']);
    // CVT is not a public option; it is grouped under "automatic".
    expect(filters.transmissions).toEqual(['automatic']);
    expect(filters.bodyTypes).toEqual(['suv']);
    expect(filters.owners).toEqual([1, 3]);
    expect(filters.colours).toEqual(['pearl white', 'red']);
  });

  it('reads price in lakh, swapping a reversed range and ignoring a zero minimum', () => {
    expect(parseListingState({ min_price: '10', max_price: '5.5' }).filters).toMatchObject({
      minPrice: 5.5,
      maxPrice: 10,
    });
    expect(parseListingState({ min_price: '0', max_price: 'abc' }).filters).toMatchObject({
      minPrice: null,
      maxPrice: null,
    });
  });

  it('only accepts the listed km options and sane years, sorts and pages', () => {
    const s = parseListingState({ km: '12345', year: '1850', sort: 'cheapest', page: '999' });
    expect(s.filters.maxKm).toBeNull();
    expect(s.filters.minYear).toBeNull();
    expect(s.sort).toBe('newest');
    expect(s.page).toBe(1);
    expect(parseListingState({ km: '50000', year: '2020', page: '3' })).toMatchObject({
      filters: { maxKm: 50000, minYear: 2020 },
      page: 3,
    });
  });
});

describe('listingHref', () => {
  const state = parseListingState({ brand: 'bmw', fuel: 'petrol,diesel', sort: 'price_asc', page: '3' });

  it('keeps lists readable and leaves defaults out', () => {
    expect(listingHref('/cars', parseListingState({}))).toBe('/cars');
    expect(listingHref('/cars', state, { page: 3 })).toBe('/cars?brand=bmw&fuel=petrol,diesel&sort=price_asc&page=3');
  });

  it('goes back to page 1 on any filter or sort change', () => {
    expect(listingHref('/cars', state, { filters: { fuels: ['cng'] } })).toBe('/cars?brand=bmw&fuel=cng&sort=price_asc');
    expect(listingHref('/cars', state, { sort: 'newest' })).toBe('/cars?brand=bmw&fuel=petrol,diesel');
  });

  it('encodes colours and round-trips through the parser', () => {
    const s = parseListingState({
      colour: 'pearl white',
      min_price: '7.5',
      owners: '1,3',
      transmission: 'manual',
      model: 'x1',
    });
    const href = listingHref('/cars/type/suv', s, { page: 2 });
    expect(href).toContain('colour=pearl%20white');
    const url = new URL(href, 'http://localhost');
    expect(parseListingState(Object.fromEntries(url.searchParams))).toEqual({ ...s, page: 2 });
  });
});

describe('toRpcFilters', () => {
  it('converts lakh to rupees and leaves out empty filters', () => {
    const { filters } = parseListingState({ min_price: '5', max_price: '15.25', owners: '3', km: '30000' });
    expect(toRpcFilters(filters)).toEqual({ price_min: 500000, price_max: 1525000, owners: ['3'], km_max: 30000 });
    expect(toRpcFilters(EMPTY_FILTERS)).toEqual({});
  });
});

const models = [
  { slug: 'creta', name: 'Creta', brandSlug: 'hyundai' },
  { slug: 'x1', name: 'X1', brandSlug: 'bmw' },
];

describe('withoutBrand', () => {
  it("drops the brand's selected models too", () => {
    const { filters } = parseListingState({ brand: 'hyundai,bmw', model: 'creta,x1' });
    expect(withoutBrand(filters, 'hyundai', models)).toEqual({ brands: ['bmw'], models: ['x1'] });
    expect(withoutBrand(filters, 'bmw', models)).toEqual({ brands: ['hyundai'], models: ['creta'] });
  });

  it('clears models when no brand is left', () => {
    const { filters } = parseListingState({ brand: 'bmw', model: 'x1' });
    expect(withoutBrand(filters, 'bmw', models)).toEqual({ brands: [], models: [] });
  });
});

describe('activeFilters', () => {
  it('labels each filter with display names and a removal', () => {
    const { filters } = parseListingState({
      brand: 'bmw,unknown-brand',
      model: 'x1',
      max_price: '20',
      transmission: 'automatic',
      owners: '3',
      colour: 'white',
      km: '100000',
      year: '2022',
    });
    const chips = activeFilters(filters, {
      brands: [{ slug: 'bmw', name: 'BMW' }],
      models,
      colours: [{ value: 'white', name: 'White' }],
    });
    expect(chips.map((c) => c.label)).toEqual([
      'Under ₹20 Lakh',
      'BMW',
      'Unknown Brand',
      'X1',
      '2022 & newer',
      'Under 1,00,000 km',
      'Automatic',
      '3rd owner or more',
      'White',
    ]);
    expect(chips.find((c) => c.key === 'brand:bmw')?.remove).toEqual({ brands: ['unknown-brand'], models: [] });
    expect(countActiveFilters(filters)).toBe(9);
  });
});

describe('priceLabel', () => {
  it('describes open and closed ranges', () => {
    expect(priceLabel(5, 10)).toBe('₹5 Lakh – ₹10 Lakh');
    expect(priceLabel(null, 5)).toBe('Under ₹5 Lakh');
    expect(priceLabel(120, null)).toBe('Over ₹1.2 Crore');
    expect(priceLabel(null, null)).toBeNull();
  });
});

describe('yearOptions', () => {
  it('offers every other year going back from this year', () => {
    expect(yearOptions(new Date('2026-09-27'))).toEqual([2024, 2022, 2020, 2018, 2016]);
  });
});

describe('car badges', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  it('marks cars published in the last 14 days as New Arrival', () => {
    expect(isNewArrival(daysAgo(0), now)).toBe(true);
    expect(isNewArrival(daysAgo(13.9), now)).toBe(true);
    expect(isNewArrival(daysAgo(14), now)).toBe(false);
    expect(isNewArrival(null, now)).toBe(false);
    expect(isNewArrival('not a date', now)).toBe(false);
  });

  it('lists Reserved first and only the allowed badges', () => {
    expect(carBadges({ publishedAt: daysAgo(1), featured: true, status: 'reserved' }, now)).toEqual([
      'reserved',
      'new-arrival',
      'featured',
    ]);
    expect(carBadges({ publishedAt: daysAgo(30), featured: false, status: 'published' }, now)).toEqual([]);
  });
});

describe('contact links', () => {
  it('normalises Indian numbers however staff typed them', () => {
    expect(whatsappHref('98765 43210')).toBe('https://wa.me/919876543210');
    expect(whatsappHref('+91-98765-43210', 'Hi there')).toBe('https://wa.me/919876543210?text=Hi%20there');
    expect(whatsappHref('09876543210')).toBe('https://wa.me/919876543210');
    expect(telHref('040 2345 6789')).toBe('tel:+914023456789');
  });

  it('returns null when there is no usable number', () => {
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappHref('')).toBeNull();
    expect(telHref('123')).toBeNull();
  });
});
