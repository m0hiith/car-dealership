import { describe, expect, it } from 'vitest';
import { formatDate, formatKm, formatPriceFull, formatPriceLakh } from '@/lib/format';

describe('formatPriceLakh', () => {
  it.each([
    [450000, '₹4.5 Lakh'],
    [1525000, '₹15.25 Lakh'],
    [10000000, '₹1 Crore'],
    [100000, '₹1 Lakh'],
    [1500000, '₹15 Lakh'],
    [4200000, '₹42 Lakh'],
    [1525999, '₹15.26 Lakh'],
    [12000000, '₹1.2 Crore'],
    [12500000, '₹1.25 Crore'],
    [150000000, '₹15 Crore'],
  ])('%i -> %s', (input, expected) => {
    expect(formatPriceLakh(input)).toBe(expected);
  });

  it('switches to crore when rounding reaches 100 lakh', () => {
    expect(formatPriceLakh(9999999)).toBe('₹1 Crore');
  });

  it('shows the full figure below 1 lakh', () => {
    expect(formatPriceLakh(85000)).toBe('₹85,000');
    expect(formatPriceLakh(0)).toBe('₹0');
  });

  it('rejects invalid amounts', () => {
    expect(() => formatPriceLakh(-1)).toThrow(RangeError);
    expect(() => formatPriceLakh(Number.NaN)).toThrow(RangeError);
    expect(() => formatPriceLakh(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatPriceFull', () => {
  it.each([
    [450000, '₹4,50,000'],
    [1525000, '₹15,25,000'],
    [10000000, '₹1,00,00,000'],
    [4200000, '₹42,00,000'],
    [999, '₹999'],
  ])('%i -> %s', (input, expected) => {
    expect(formatPriceFull(input)).toBe(expected);
  });

  it('rejects negative amounts', () => {
    expect(() => formatPriceFull(-100)).toThrow(RangeError);
  });
});

describe('formatKm', () => {
  it.each([
    [32000, '32,000 km'],
    [100000, '1,00,000 km'],
    [28000, '28,000 km'],
    [450000, '4,50,000 km'],
    [0, '0 km'],
    [999.6, '1,000 km'],
  ])('%d -> %s', (input, expected) => {
    expect(formatKm(input)).toBe(expected);
  });

  it('rejects negative distances', () => {
    expect(() => formatKm(-5)).toThrow(RangeError);
  });
});

describe('formatDate', () => {
  it('uses Asia/Kolkata, not UTC', () => {
    // 20:00 UTC on 25 Sep is 01:30 IST on 26 Sep.
    expect(formatDate('2026-09-25T20:00:00Z')).toMatch(/^26 Sept? 2026$/);
  });

  it('rejects invalid dates', () => {
    expect(() => formatDate('not a date')).toThrow(RangeError);
  });
});
