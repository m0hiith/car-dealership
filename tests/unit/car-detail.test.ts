import { describe, expect, it } from 'vitest';
import { carEnquiryMessage, carFollowUpMessage, carWhatsappMessage } from '@/lib/car-enquiry';
import { leadSchema, normaliseIndianMobile } from '@/lib/validation/lead';

describe('normaliseIndianMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['98765 43210', '9876543210'],
    ['+91 98765-43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['(987) 654-3210', '9876543210'],
  ])('accepts %s', (input, expected) => {
    expect(normaliseIndianMobile(input)).toBe(expected);
  });

  it.each(['5876543210', '987654321', '98765432100', '+1 9876543210', 'abcdefghij', ''])('rejects %s', (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });
});

describe('leadSchema', () => {
  const base = { name: '  Ravi Kumar ', phone: '+91 98765 43210', email: '', preferredTime: '', message: '' };

  it('trims, normalises the phone and drops empty optional fields', () => {
    expect(leadSchema.parse(base)).toEqual({ name: 'Ravi Kumar', phone: '9876543210' });
  });

  it('keeps valid optional fields and a car slug', () => {
    const lead = leadSchema.parse({
      ...base,
      email: ' Ravi@Example.com ',
      preferredTime: 'Any time',
      message: 'Is it available?',
      carSlug: '2022-hyundai-creta-sx-petrol-automatic',
    });
    expect(lead).toMatchObject({
      email: 'ravi@example.com',
      preferredTime: 'Any time',
      message: 'Is it available?',
      carSlug: '2022-hyundai-creta-sx-petrol-automatic',
    });
  });

  it('reports each invalid field', () => {
    const result = leadSchema.safeParse({ name: ' ', phone: '12345', email: 'nope', preferredTime: 'Midnight' });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['name', 'phone', 'email', 'preferredTime']));
  });

  it('rejects a car slug that is not a slug', () => {
    expect(leadSchema.safeParse({ ...base, carSlug: '../admin' }).success).toBe(false);
  });
});

describe('car enquiry messages', () => {
  const car = { title: '2022 Hyundai Creta', variant: 'SX', price: 1525000, status: 'published' as const };
  const url = 'https://example.com/cars/2022-hyundai-creta-sx';

  it('names the car, full price and page URL', () => {
    expect(carWhatsappMessage(car, url)).toBe(
      `Hi, I'm interested in the 2022 Hyundai Creta SX (₹15,25,000). Is it still available? ${url}`,
    );
    expect(carFollowUpMessage(car, url)).toContain('2022 Hyundai Creta SX (₹15,25,000)');
    expect(carEnquiryMessage(car)).toBe("I'm interested in the 2022 Hyundai Creta SX. Is it still available?");
  });

  it('asks about similar cars when reserved', () => {
    const reserved = { ...car, status: 'reserved' as const, variant: null };
    expect(carWhatsappMessage(reserved, url)).toContain('is reserved. Do you have anything similar?');
    expect(carEnquiryMessage(reserved)).toBe('I saw the 2022 Hyundai Creta is reserved. Do you have anything similar?');
  });
});
