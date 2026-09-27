import type { CarStatus } from './car-options';

/**
 * Which status a car may move to from the form (PRODUCT_SPEC §7). The same
 * status means "save changes, keep the status". Shared by the form, which
 * only offers these actions, and the server action, which enforces them.
 */
export const STATUS_TRANSITIONS: Record<CarStatus, readonly CarStatus[]> = {
  draft: ['draft', 'published'],
  published: ['published', 'draft', 'reserved', 'sold', 'archived'],
  // A deal can fall through, so reserved can go back to published.
  reserved: ['reserved', 'published', 'draft', 'sold', 'archived'],
  // Undoing a sale entered by mistake clears sold_at (DB trigger).
  sold: ['sold', 'published', 'archived'],
  archived: ['archived', 'draft'],
};

/** A car that does not exist yet can only be saved as a draft or published. */
export const NEW_CAR_STATUSES: readonly CarStatus[] = ['draft', 'published'];

export function canMoveTo(from: CarStatus | null, to: CarStatus) {
  return (from === null ? NEW_CAR_STATUSES : STATUS_TRANSITIONS[from]).includes(to);
}

/** Statuses that show the car on the public site; these need at least one photo. */
export function isPublicStatus(status: CarStatus) {
  return status === 'published' || status === 'reserved';
}
