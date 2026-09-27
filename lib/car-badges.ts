/**
 * The badges a listing card may show (CLAUDE.md §4), all derived from data.
 * 1st Owner is also allowed but cards already say it in the spec row.
 */

export const NEW_ARRIVAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CarBadge = 'new-arrival' | 'featured' | 'reserved';

export function isNewArrival(publishedAt: string | null, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const published = Date.parse(publishedAt);
  return !Number.isNaN(published) && published <= now && now - published < NEW_ARRIVAL_DAYS * DAY_MS;
}

/** Badges for a listing card, most important first. */
export function carBadges(
  car: { publishedAt: string | null; featured: boolean; status: string },
  now = Date.now(),
): CarBadge[] {
  const badges: CarBadge[] = [];
  if (car.status === 'reserved') badges.push('reserved');
  if (isNewArrival(car.publishedAt, now)) badges.push('new-arrival');
  if (car.featured) badges.push('featured');
  return badges;
}
