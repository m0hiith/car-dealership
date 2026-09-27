import { describe, expect, it } from 'vitest';
import { loginSchema, safeAdminRedirect } from '@/lib/validation/auth';

describe('safeAdminRedirect', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/cars', '/admin/cars'],
    ['/admin/cars?status=sold', '/admin/cars?status=sold'],
    ['/admin/cars/123/edit#photos', '/admin/cars/123/edit#photos'],
  ])('keeps admin path %s', (input, expected) => {
    expect(safeAdminRedirect(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['https://evil.com/admin'],
    ['//evil.com/admin'],
    ['/\\evil.com'],
    ['/admin\\@evil.com'],
    ['/cars'],
    ['/administrator'],
    ['/admin/login'],
    ['/admin/login?next=/admin'],
    ['admin'],
  ])('falls back to /admin for %s', (input) => {
    expect(safeAdminRedirect(input)).toBe('/admin');
  });
});

describe('loginSchema', () => {
  it('trims and lowercases the email', () => {
    const result = loginSchema.parse({ email: '  Owner@Example.COM ', password: 'x' });
    expect(result.email).toBe('owner@example.com');
  });

  it('rejects a malformed email and an empty password', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '' });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('rejects missing fields (FormData.get returns null)', () => {
    expect(loginSchema.safeParse({ email: null, password: null }).success).toBe(false);
  });
});
