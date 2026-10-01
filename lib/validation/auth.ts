import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address.' })),
  password: z.string().min(1, { error: 'Enter your password.' }).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const ADMIN_HOME = '/admin';
export const ADMIN_LOGIN = '/admin/login';

/**
 * Where to send an admin after signing in. Only same-origin paths under
 * /admin are allowed, so `?next=` can never become an open redirect.
 */
export function safeAdminRedirect(next: unknown): string {
  if (typeof next !== 'string') return ADMIN_HOME;
  // Reject protocol-relative ("//evil.com") and backslash tricks ("/\evil.com").
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return ADMIN_HOME;
  const path = next.split(/[?#]/)[0];
  if (path !== ADMIN_HOME && !path.startsWith(`${ADMIN_HOME}/`)) return ADMIN_HOME;
  if (path === ADMIN_LOGIN || path.startsWith(`${ADMIN_LOGIN}/`)) return ADMIN_HOME;
  return next;
}
