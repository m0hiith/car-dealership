import { describe, expect, it } from 'vitest';
import { parseSellRequestsParams, sellRequestUpdateSchema } from '@/lib/validation/admin-sell';
import { OTHER, sellPhotoUploadSchema, sellRequestSchema, SELL_STEPS } from '@/lib/validation/sell';

const BRAND = '0b6e5d0e-1f7c-4c55-9a51-0f4c4a2b9d11';
const MODEL = '9f1c2e3d-4b5a-4c6d-8e7f-0a1b2c3d4e5f';
const PHOTO = 'uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.webp';

const valid = {
  brandId: BRAND,
  brandOther: '',
  modelId: MODEL,
  modelOther: '',
  variant: 'VX CVT',
  year: '2019',
  kmsDriven: '45,000',
  fuelType: 'petrol',
  transmission: 'cvt',
  owners: '1',
  registrationState: 'TS',
  registrationCity: 'Hyderabad',
  expectedPrice: '₹5,50,000',
  conditionNotes: '',
  photoPaths: [PHOTO],
  name: 'Ravi',
  phone: '+91 98765 43210',
  preferredTime: '',
};

describe('sellRequestSchema', () => {
  it('accepts a complete request and normalises numbers and the phone', () => {
    const parsed = sellRequestSchema.parse(valid);
    expect(parsed.kmsDriven).toBe(45000);
    expect(parsed.expectedPrice).toBe(550000);
    expect(parsed.year).toBe(2019);
    expect(parsed.phone).toBe('9876543210');
    expect(parsed.conditionNotes).toBeNull();
    expect(parsed.preferredTime).toBeNull();
  });

  it('accepts an "Other" brand with typed names', () => {
    const r = sellRequestSchema.safeParse({
      ...valid,
      brandId: OTHER,
      brandOther: 'Fiat',
      modelId: '',
      modelOther: 'Linea',
    });
    expect(r.success).toBe(true);
  });

  it.each([
    ['no brand', { brandId: '' }, 'brandId'],
    ['an "Other" brand without its name', { brandId: OTHER, modelId: '', modelOther: 'X' }, 'brandOther'],
    ['a listed brand without a model', { modelId: '' }, 'modelId'],
    ['an "Other" model without its name', { modelId: OTHER }, 'modelOther'],
    ['a future year', { year: String(new Date().getFullYear() + 2) }, 'year'],
    ['text for kilometres', { kmsDriven: 'lots' }, 'kmsDriven'],
    ['an unknown fuel', { fuelType: 'steam' }, 'fuelType'],
    ['a bad price', { expectedPrice: 'about 5 lakh' }, 'expectedPrice'],
    ['a landline', { phone: '040 1234 5678' }, 'phone'],
    ['a photo path the server did not issue', { photoPaths: ['../../etc/passwd'] }, 'photoPaths'],
    ['nine photos', { photoPaths: Array(9).fill(PHOTO) }, 'photoPaths'],
    ['the same photo twice', { photoPaths: [PHOTO, PHOTO] }, 'photoPaths'],
    ['no name', { name: ' ' }, 'name'],
  ])('rejects %s', (_name, change, field) => {
    const r = sellRequestSchema.safeParse({ ...valid, ...change });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === field)).toBe(true);
  });

  it('assigns every field to exactly one step', () => {
    const fields = SELL_STEPS.flatMap((s) => s.fields).sort();
    expect(fields).toEqual(Object.keys(valid).sort());
  });
});

describe('sellPhotoUploadSchema', () => {
  it('accepts a compressed WebP', () => {
    expect(sellPhotoUploadSchema.safeParse({ type: 'image/webp', size: 300_000 }).success).toBe(true);
  });
  it.each([
    [{ type: 'image/png', size: 300_000 }],
    [{ type: 'image/webp', size: 0 }],
    [{ type: 'image/webp', size: 50 * 1024 * 1024 }],
  ])('rejects %o', (input) => {
    expect(sellPhotoUploadSchema.safeParse(input).success).toBe(false);
  });
});

describe('admin sell requests', () => {
  it('falls back to defaults for bad params', () => {
    expect(parseSellRequestsParams({ status: 'bogus', page: '-3' })).toEqual({ status: undefined, page: 1 });
    expect(parseSellRequestsParams({ status: 'offer_made', page: '2' })).toEqual({ status: 'offer_made', page: 2 });
  });

  it('clears empty notes and caps their length', () => {
    expect(sellRequestUpdateSchema.parse({ id: BRAND, status: 'contacted', notes: '  ' }).notes).toBeNull();
    expect(sellRequestUpdateSchema.safeParse({ id: BRAND, status: 'new', notes: 'x'.repeat(5001) }).success).toBe(
      false,
    );
  });
});
