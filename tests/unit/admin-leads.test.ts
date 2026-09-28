import { describe, expect, it, vi } from 'vitest';
import { formatRelativeDateTime } from '@/lib/format';
import { leadSearchFilter, leadsHref, parseLeadsParams } from '@/lib/validation/admin-leads';

vi.mock('server-only', () => ({}));
const { buildLeadEmail, leadEmailConfig } = await import('@/lib/notifications/lead-email');

describe('formatRelativeDateTime (Asia/Kolkata)', () => {
  // 27 Sept 2026, 9:00 PM IST
  const now = new Date('2026-09-27T15:30:00Z');

  it.each([
    ['2026-09-27T15:12:00Z', 'Today 8:42 PM'],
    // 12:10 AM IST on the 27th is still "today" in India, though it is the 26th in UTC.
    ['2026-09-26T18:40:00Z', 'Today 12:10 AM'],
    ['2026-09-26T18:20:00Z', 'Yesterday 11:50 PM'],
    ['2026-09-23T04:30:00Z', 'Wed 10:00 AM'],
    ['2026-03-05T06:30:00Z', '5 Mar, 12:00 PM'],
  ])('%s -> %s', (value, expected) => {
    expect(formatRelativeDateTime(value, now)).toBe(expected);
  });

  it('shows only the date for earlier years', () => {
    expect(formatRelativeDateTime('2025-12-31T10:00:00Z', now)).toBe('31 Dec 2025');
  });
});

describe('leadSearchFilter', () => {
  it('matches every word of a name', () => {
    expect(leadSearchFilter('ravi')).toBe('name.ilike.*ravi*');
    expect(leadSearchFilter('Ravi Kumar')).toBe('and(name.ilike.*ravi*,name.ilike.*kumar*)');
  });

  it('matches phone digits, ignoring +91, spaces and a leading 0', () => {
    expect(leadSearchFilter('+91 98765 43210')).toBe('phone.like.*9876543210*');
    expect(leadSearchFilter('09876543210')).toBe('phone.like.*9876543210*');
    expect(leadSearchFilter('43210')).toBe('phone.like.*43210*');
    expect(leadSearchFilter('12')).toBeNull();
  });

  it('strips characters that mean something in a PostgREST filter', () => {
    expect(leadSearchFilter('ravi),status.eq.new')).toBe(
      'and(name.ilike.*ravi*,name.ilike.*status*,name.ilike.*eq*,name.ilike.*new*)',
    );
    expect(leadSearchFilter('*(),')).toBeNull();
    expect(leadSearchFilter(undefined)).toBeNull();
  });
});

describe('lead list params', () => {
  it('drops invalid values instead of failing', () => {
    expect(parseLeadsParams({ status: 'bogus', car: 'x', page: '-3', q: '  ' })).toEqual({
      status: undefined,
      q: undefined,
      car: undefined,
      page: 1,
    });
  });

  it('builds links and resets the page on filter changes', () => {
    const params = parseLeadsParams({ status: 'new', q: 'ravi', page: '3' });
    expect(leadsHref(params)).toBe('/admin/leads?status=new&q=ravi');
    expect(leadsHref(params, { page: 4 })).toBe('/admin/leads?status=new&q=ravi&page=4');
    expect(leadsHref(params, { status: undefined, q: undefined })).toBe('/admin/leads');
  });
});

describe('new-lead email', () => {
  it('is off unless enabled and fully configured', () => {
    expect(leadEmailConfig({ RESEND_API_KEY: 'k', LEAD_EMAIL_FROM: 'a@b.in', LEAD_EMAIL_TO: 'c@d.in' })).toBeNull();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(leadEmailConfig({ LEAD_EMAIL_ENABLED: 'true', RESEND_API_KEY: 'k' })).toBeNull();
    expect(
      leadEmailConfig({
        LEAD_EMAIL_ENABLED: 'true',
        RESEND_API_KEY: 'k',
        LEAD_EMAIL_FROM: 'Site <a@b.in>',
        LEAD_EMAIL_TO: 'c@d.in, e@f.in',
      }),
    ).toEqual({ apiKey: 'k', from: 'Site <a@b.in>', to: ['c@d.in', 'e@f.in'] });
  });

  it('escapes what the visitor typed', () => {
    const email = buildLeadEmail({
      dealershipName: 'Test Motors',
      name: '<script>x</script>',
      phone: '9876543210',
      message: 'Is it "available"?',
      car: { title: '2021 Hyundai Creta', slug: '2021-hyundai-creta' },
    });
    expect(email.subject).toBe('New enquiry from <script>x</script> – 2021 Hyundai Creta');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.text).toContain('Phone: 98765 43210');
  });
});
