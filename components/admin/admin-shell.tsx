import Link from 'next/link';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminNav } from './admin-nav';

function AdminBrand({ name }: { name: string }) {
  return (
    <Link href="/admin" className="flex min-w-0 flex-col rounded-control focus-ring">
      <span className="truncate text-headline-sm text-white">{name || 'Dashboard'}</span>
      <span className="text-label-sm text-highlight uppercase">Admin</span>
    </Link>
  );
}

/** Navy sidebar on desktop, top bar + drawer below 1200px, light canvas for content. */
export function AdminShell({
  dealershipName,
  newLeadCount,
  children,
}: {
  dealershipName: string;
  newLeadCount: number;
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
        <AdminMobileNav brand={<AdminBrand name={dealershipName} />}>
          <AdminNav newLeadCount={newLeadCount} />
        </AdminMobileNav>

        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy-dark lg:flex">
          <div className="px-6 pt-6 pb-8">
            <AdminBrand name={dealershipName} />
          </div>
          <AdminNav newLeadCount={newLeadCount} />
        </aside>

        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
