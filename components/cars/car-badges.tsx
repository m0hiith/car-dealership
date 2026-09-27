import { Badge, type BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CarBadge } from '@/lib/car-badges';

const BADGES: Record<CarBadge, { label: string; tone: BadgeTone }> = {
  // Amber is for Reserved only (CLAUDE.md §4).
  reserved: { label: 'Reserved', tone: 'amber' },
  'new-arrival': { label: 'New Arrival', tone: 'blue' },
  featured: { label: 'Featured', tone: 'navy' },
};

export function CarBadges({ badges, className }: { badges: CarBadge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((badge) => (
        <li key={badge}>
          <Badge tone={BADGES[badge].tone} className="shadow-card">
            {BADGES[badge].label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
