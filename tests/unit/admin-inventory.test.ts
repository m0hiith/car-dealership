import { describe, expect, it } from 'vitest';
import { MORE_STATUS_ACTIONS, PUBLISH_ACTION } from '@/components/admin/car-status-actions';
import { CAR_STATUSES } from '@/lib/car-options';
import { canMoveTo } from '@/lib/car-status';
import {
  carStatusChangeSchema,
  hasInventoryFilters,
  inventoryHref,
  inventorySearchTokens,
  parseInventoryParams,
} from '@/lib/validation/admin-cars';

const brand = '9b2e8c1a-1d2f-4a3b-8c4d-5e6f7a8b9c0d';

describe('parseInventoryParams', () => {
  it('defaults to all cars, recently updated, page 1', () => {
    expect(parseInventoryParams({})).toEqual({
      status: undefined,
      q: undefined,
      brand: undefined,
      fuel: undefined,
      transmission: undefined,
      sort: 'updated',
      page: 1,
    });
  });

  it('reads valid params', () => {
    const p = parseInventoryParams({
      status: 'sold',
      q: '  creta ',
      brand,
      fuel: 'diesel',
      transmission: 'amt',
      sort: 'price_asc',
      page: '3',
    });
    expect(p).toEqual({
      status: 'sold',
      q: 'creta',
      brand,
      fuel: 'diesel',
      transmission: 'amt',
      sort: 'price_asc',
      page: 3,
    });
  });

  it('ignores invalid values instead of failing', () => {
    const p = parseInventoryParams({
      status: 'deleted',
      q: '   ',
      brand: 'not-a-uuid',
      fuel: 'steam',
      transmission: 'auto',
      sort: 'random',
      page: '-2',
    });
    expect(p).toEqual(parseInventoryParams({}));
    expect(parseInventoryParams({ page: 'abc' }).page).toBe(1);
    expect(parseInventoryParams({ page: '2.5' }).page).toBe(1);
  });

  it('takes the first of repeated params', () => {
    expect(parseInventoryParams({ status: ['draft', 'sold'] }).status).toBe('draft');
  });
});

describe('inventoryHref', () => {
  const base = parseInventoryParams({});

  it('leaves defaults out of the URL', () => {
    expect(inventoryHref(base)).toBe('/admin/cars');
    expect(inventoryHref(base, { status: 'draft' })).toBe('/admin/cars?status=draft');
  });

  it('keeps search and filters, and resets the page on any other change', () => {
    const current = parseInventoryParams({ q: 'city', brand, sort: 'year_desc', page: '4' });
    expect(inventoryHref(current, { status: 'published' })).toBe(
      `/admin/cars?status=published&q=city&brand=${brand}&sort=year_desc`,
    );
    expect(inventoryHref(current, { page: 5 })).toBe(`/admin/cars?q=city&brand=${brand}&sort=year_desc&page=5`);
  });

  it('round-trips through the parser', () => {
    const current = parseInventoryParams({ status: 'reserved', q: 'x1', fuel: 'petrol', page: '2' });
    const url = new URL(inventoryHref(current, { page: 2 }), 'http://localhost');
    expect(parseInventoryParams(Object.fromEntries(url.searchParams))).toEqual(current);
  });
});

describe('hasInventoryFilters', () => {
  it('ignores status, sort and page', () => {
    expect(hasInventoryFilters(parseInventoryParams({ status: 'sold', sort: 'created', page: '2' }))).toBe(false);
    expect(hasInventoryFilters(parseInventoryParams({ fuel: 'cng' }))).toBe(true);
  });
});

describe('inventorySearchTokens', () => {
  it('splits, lowercases and de-duplicates words', () => {
    expect(inventorySearchTokens('2022 Hyundai  CRETA creta')).toEqual(['2022', 'hyundai', 'creta']);
    expect(inventorySearchTokens('Mercedes-Benz 1.2')).toEqual(['mercedes-benz', '1.2']);
  });

  it('strips characters that have meaning in PostgREST filters', () => {
    expect(inventorySearchTokens('a,b (c) *d* "e" \\f%g')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(inventorySearchTokens('),or(status.eq.draft')).toEqual(['or', 'status.eq.draft']);
    expect(inventorySearchTokens('...')).toEqual([]);
    expect(inventorySearchTokens(undefined)).toEqual([]);
  });

  it('keeps at most 6 words', () => {
    expect(inventorySearchTokens('a b c d e f g h')).toHaveLength(6);
  });
});

describe('carStatusChangeSchema', () => {
  it('needs a car id and a real status', () => {
    expect(carStatusChangeSchema.safeParse({ id: brand, to: 'sold' }).success).toBe(true);
    expect(carStatusChangeSchema.safeParse({ id: brand, to: 'deleted' }).success).toBe(false);
    expect(carStatusChangeSchema.safeParse({ id: '1', to: 'sold' }).success).toBe(false);
  });
});

describe('status actions offered in the list', () => {
  it('only offers moves the server allows', () => {
    for (const from of CAR_STATUSES) {
      const offered = from === 'draft' ? [PUBLISH_ACTION] : MORE_STATUS_ACTIONS[from];
      for (const action of offered) expect(canMoveTo(from, action.to)).toBe(true);
    }
  });

  it('lets sold cars be archived but never offers a delete-like move', () => {
    expect(MORE_STATUS_ACTIONS.sold.map((a) => a.to)).toContain('archived');
    expect(MORE_STATUS_ACTIONS.sold.map((a) => a.to)).not.toContain('draft');
  });
});
