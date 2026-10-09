'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui';
import {
  CarIcon,
  GridIcon,
  InboxIcon,
  LayoutIcon,
  LogoutIcon,
  PlusIcon,
  QuoteIcon,
  SettingsIcon,
  StarIcon,
  TagIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { signOut } from '@/lib/actions/auth';
import { activeNavKey, ADMIN_NAV, type AdminNavKey } from './nav-items';

const icons: Record<AdminNavKey, typeof GridIcon> = {
  dashboard: GridIcon,
  cars: CarIcon,
  'add-car': PlusIcon,
  leads: InboxIcon,
  'sell-requests': TagIcon,
  testimonials: QuoteIcon,
  feedback: StarIcon,
  content: LayoutIcon,
  settings: SettingsIcon,
};

const itemStyles =
  'flex h-11 w-full items-center gap-3 rounded-control px-3 text-label-lg text-white/75 focus-ring transition-colors hover:bg-white/5 hover:text-white';

export function AdminNav({ newLeadCount, newSellCount }: { newLeadCount: number; newSellCount: number }) {
  const active = activeNavKey(usePathname());

  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col px-3 pb-4">
      <ul className="flex flex-col gap-1">
        {ADMIN_NAV.map(({ key, href, label }) => {
          const Icon = icons[key];
          const isActive = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(itemStyles, isActive && 'bg-white/10 text-white')}
              >
                <Icon width={20} height={20} className={isActive ? 'text-highlight' : undefined} />
                <span className="flex-1">{label}</span>
                {key === 'leads' && <NewCount count={newLeadCount} />}
                {key === 'sell-requests' && <NewCount count={newSellCount} />}
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={signOut} className="mt-auto border-t border-white/10 pt-4">
        <button type="submit" className={itemStyles}>
          <LogoutIcon width={20} height={20} />
          Logout
        </button>
      </form>
    </nav>
  );
}

function NewCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge tone="blue" aria-label={`${count} new`}>
      {count > 99 ? '99+' : count}
    </Badge>
  );
}
