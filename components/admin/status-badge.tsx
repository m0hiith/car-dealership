import { Badge, type BadgeTone } from '@/components/ui';
import type { Database } from '@/lib/database.types';
import { LEAD_STATUS_LABELS, type LeadStatus } from '@/lib/lead-status';
import { SELL_REQUEST_STATUS_LABELS, type SellRequestStatus } from '@/lib/sell-status';

type CarStatus = Database['public']['Enums']['car_status'];

// Amber is reserved for Reserved; green is never used for workflow states (CLAUDE.md §4).
const carStatus: Record<CarStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'blue' },
  reserved: { label: 'Reserved', tone: 'amber' },
  sold: { label: 'Sold', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge tone={status === 'new' ? 'blue' : 'neutral'} dot>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}

export function CarStatusBadge({ status }: { status: CarStatus }) {
  const { label, tone } = carStatus[status];
  return (
    <Badge tone={tone} dot data-testid="car-status">
      {label}
    </Badge>
  );
}

export function SellRequestStatusBadge({ status }: { status: SellRequestStatus }) {
  return (
    <Badge tone={status === 'new' ? 'blue' : 'neutral'} dot>
      {SELL_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
