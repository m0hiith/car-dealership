import { Constants, type Database } from '@/lib/database.types';

export type LeadStatus = Database['public']['Enums']['lead_status'];

export const LEAD_STATUSES = Constants.public.Enums.lead_status;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  test_drive: 'Test drive',
  negotiation: 'Negotiation',
  closed: 'Closed',
  lost: 'Lost',
};
