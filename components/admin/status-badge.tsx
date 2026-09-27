import { Badge, type BadgeTone } from '@/components/ui';
import type { Database } from '@/lib/database.types';

type CarStatus = Database['public']['Enums']['car_status'];
type LeadStatus = Database['public']['Enums']['lead_status'];

// Amber is reserved for Reserved; green is never used for workflow states (CLAUDE.md §4).
const carStatus: Record<CarStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'blue' },
  reserved: { label: 'Reserved', tone: 'amber' },
  sold: { label: 'Sold', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

const leadStatus: Record<LeadStatus, { label: string; tone: BadgeTone }> = {
  new: { label: 'New', tone: 'blue' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  test_drive: { label: 'Test drive', tone: 'neutral' },
  negotiation: { label: 'Negotiation', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'neutral' },
  lost: { label: 'Lost', tone: 'neutral' },
};

export function CarStatusBadge({ status }: { status: CarStatus }) {
  const { label, tone } = carStatus[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, tone } = leadStatus[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
