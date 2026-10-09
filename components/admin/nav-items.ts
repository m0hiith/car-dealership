export const ADMIN_NAV = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard' },
  { key: 'cars', href: '/admin/cars', label: 'Cars' },
  { key: 'add-car', href: '/admin/cars/new', label: 'Add Car' },
  { key: 'leads', href: '/admin/leads', label: 'Leads' },
  { key: 'sell-requests', href: '/admin/sell-requests', label: 'Sell Requests' },
  { key: 'testimonials', href: '/admin/testimonials', label: 'Testimonials' },
  { key: 'feedback', href: '/admin/feedback', label: 'Feedback' },
  { key: 'content', href: '/admin/content', label: 'Homepage Content' },
  { key: 'settings', href: '/admin/settings', label: 'Settings' },
] as const;

export type AdminNavKey = (typeof ADMIN_NAV)[number]['key'];

/**
 * The nav item for a pathname: the longest href that equals it or is a path
 * prefix of it. So /admin/cars/new is "Add Car", /admin/cars/123/edit is
 * "Cars", and /admin only matches itself.
 */
export function activeNavKey(pathname: string): AdminNavKey | null {
  let best: (typeof ADMIN_NAV)[number] | null = null;
  for (const item of ADMIN_NAV) {
    const matches = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
    if (matches && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.key ?? null;
}
