import { describe, expect, it } from 'vitest';
import { feedbackSchema } from '@/lib/validation/feedback';

describe('feedbackSchema', () => {
  const base = { rating: 4, comment: '', phone: '', pageUrl: '/cars' };

  it('accepts a rating alone, with empty extras as null', () => {
    expect(feedbackSchema.parse(base)).toEqual({ rating: 4, comment: null, phone: null, pageUrl: '/cars' });
  });

  it('normalises an optional mobile number', () => {
    expect(feedbackSchema.parse({ ...base, phone: '+91 98765 43210' }).phone).toBe('9876543210');
  });

  it.each([
    ['no rating', { rating: undefined }],
    ['a rating of 0', { rating: 0 }],
    ['a rating of 6', { rating: 6 }],
    ['a landline', { phone: '040 1234 5678' }],
    ['a very long comment', { comment: 'x'.repeat(1001) }],
  ])('rejects %s', (_name, change) => {
    expect(feedbackSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });

  it.each([
    ['https://evil.example/x', null],
    ['//evil.example', null],
    ['/cars/2021-hyundai-creta', '/cars/2021-hyundai-creta'],
    [undefined, null],
  ])('keeps only an on-site path: %s → %s', (pageUrl, expected) => {
    expect(feedbackSchema.parse({ ...base, pageUrl }).pageUrl).toBe(expected);
  });
});
