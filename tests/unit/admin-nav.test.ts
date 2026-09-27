import { describe, expect, it } from 'vitest';
import { activeNavKey } from '@/components/admin/nav-items';

describe('activeNavKey', () => {
  it.each([
    ['/admin', 'dashboard'],
    ['/admin/cars', 'cars'],
    ['/admin/cars/abc/edit', 'cars'],
    ['/admin/cars/new', 'add-car'],
    ['/admin/leads', 'leads'],
    ['/admin/content', 'content'],
    ['/admin/settings', 'settings'],
  ])('%s -> %s', (pathname, key) => {
    expect(activeNavKey(pathname)).toBe(key);
  });

  it('does not match partial segments or unknown paths', () => {
    expect(activeNavKey('/admin/carsx')).toBeNull();
    expect(activeNavKey('/admin/unknown')).toBeNull();
  });
});
