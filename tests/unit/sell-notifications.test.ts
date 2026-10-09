import { describe, expect, it, vi } from 'vitest';
import { buildSellRequestEmail } from '@/lib/notifications/sell-request-email';
import { ABANDONED_AFTER_MS, abandonedCandidates } from '@/lib/sell-photo-cleanup';

vi.mock('server-only', () => ({}));

describe('abandonedCandidates', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');

  it('only picks uploads older than the cutoff, with a readable date', () => {
    const files = [
      { name: 'old.webp', created_at: new Date(now - ABANDONED_AFTER_MS - 1000).toISOString() },
      { name: 'recent.webp', created_at: new Date(now - 60 * 60 * 1000).toISOString() },
      { name: 'undated.webp', created_at: null },
      { name: 'garbled.webp', created_at: 'not a date' },
    ];
    expect(abandonedCandidates(files, now)).toEqual(['uploads/old.webp']);
  });
});

describe('buildSellRequestEmail', () => {
  const base = {
    dealershipName: 'Test Motors',
    car: '2019 Honda City',
    variant: 'VX CVT',
    kmsDriven: 45000,
    fuelType: 'petrol',
    transmission: 'cvt',
    owners: 1,
    registration: 'TS, Hyderabad',
    expectedPrice: 550000,
    conditionNotes: null,
    photoCount: 3,
    name: 'Ravi',
    phone: '9876543210',
    preferredTime: null,
  } as const;

  it('lists the car and seller in Indian formats and links to the dashboard', () => {
    const { subject, text } = buildSellRequestEmail(base);
    expect(subject).toBe('Sell request from Ravi – 2019 Honda City');
    expect(text).toContain('Phone: 98765 43210');
    expect(text).toContain('Kilometres: 45,000 km');
    expect(text).toContain('Expected price: ₹5,50,000');
    expect(text).toContain('/admin/sell-requests?status=new');
  });

  it('escapes what the visitor typed in the HTML version', () => {
    const { html } = buildSellRequestEmail({ ...base, name: '<script>x</script>', conditionNotes: 'a & b' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
  });
});
