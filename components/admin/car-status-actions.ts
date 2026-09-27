import type { CarStatus } from '@/lib/car-options';

/**
 * Status changes staff can make from a car's current status, with the copy
 * shown for each. Shared by the form's save bar and the inventory list; the
 * allowed moves themselves are enforced by STATUS_TRANSITIONS in lib/car-status.
 */

export type StatusAction = {
  to: CarStatus;
  label: string;
  description: string;
  /** Asks again before running; for moves that take the car off the site. */
  confirm?: { title: string; body: string; button: string };
};

const reserve: StatusAction = {
  to: 'reserved',
  label: 'Mark reserved',
  description: 'Stays on the website with an amber “Reserved” label.',
};
const sell: StatusAction = {
  to: 'sold',
  label: 'Mark sold',
  description: 'Removes the car from the website. Its link shows similar cars instead.',
  confirm: {
    title: 'Mark this car as sold?',
    body: 'It will be removed from all listings on the website straight away.',
    button: 'Mark sold',
  },
};
const unpublish: StatusAction = {
  to: 'draft',
  label: 'Unpublish',
  description: 'Hides the car from the website and moves it back to drafts.',
};
export const ARCHIVE_ACTION: StatusAction = {
  to: 'archived',
  label: 'Archive',
  description: 'Hides the car everywhere on the website. Use this for old or cancelled listings.',
  confirm: {
    title: 'Archive this car?',
    body: 'It will be hidden from the website. You can restore it as a draft later.',
    button: 'Archive',
  },
};

/** Status moves other than the main save/publish buttons. */
export const MORE_STATUS_ACTIONS: Record<CarStatus, StatusAction[]> = {
  draft: [],
  published: [reserve, sell, unpublish, ARCHIVE_ACTION],
  reserved: [
    { to: 'published', label: 'Mark available', description: 'The deal fell through: removes the Reserved label.' },
    sell,
    unpublish,
    ARCHIVE_ACTION,
  ],
  sold: [
    {
      to: 'published',
      label: 'Mark available again',
      description: 'Undo the sale and show the car on the website again.',
    },
    ARCHIVE_ACTION,
  ],
  archived: [
    { to: 'draft', label: 'Restore as draft', description: 'Brings the car back so you can edit and publish it.' },
  ],
};

export const PUBLISH_ACTION: StatusAction = {
  to: 'published',
  label: 'Publish',
  description: 'Shows the car on the website. It needs at least one photo.',
};
