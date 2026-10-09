import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { LoginForm } from '@/components/admin/login-form';
import { Card } from '@/components/ui';
import { getAdmin } from '@/lib/auth';
import { getDealershipName } from '@/lib/queries/settings';
import { ADMIN_HOME, safeAdminRedirect } from '@/lib/validation/auth';

export const metadata: Metadata = { title: 'Sign in' };

const searchParamsSchema = z.object({
  next: z.string().max(500).optional().catch(undefined),
  error: z.enum(['forbidden']).optional().catch(undefined),
});

export default async function AdminLoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const { next, error } = searchParamsSchema.parse(await searchParams);

  // The proxy already does this; kept here so the page is safe on its own.
  if (await getAdmin()) redirect(ADMIN_HOME);

  const dealershipName = await getDealershipName();
  const safeNext = next ? safeAdminRedirect(next) : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          {dealershipName && <p className="text-label-md text-action-ink uppercase">{dealershipName}</p>}
          <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">Admin sign in</h1>
          <p className="text-body-md text-muted">For dealership staff only.</p>
        </div>
        <Card padding="lg">
          <LoginForm
            next={safeNext}
            notice={error === 'forbidden' ? 'This account does not have admin access.' : undefined}
          />
        </Card>
      </div>
    </main>
  );
}
