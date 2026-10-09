import { Constants, type Database } from '@/lib/database.types';

export type SellRequestStatus = Database['public']['Enums']['sell_request_status'];

export const SELL_REQUEST_STATUSES = Constants.public.Enums.sell_request_status;

export const SELL_REQUEST_STATUS_LABELS: Record<SellRequestStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  inspection_scheduled: 'Inspection scheduled',
  offer_made: 'Offer made',
  purchased: 'Purchased',
  rejected: 'Rejected',
};
