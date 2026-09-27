import { NextResponse, type NextRequest } from 'next/server';
import { updateSession, withSessionCookies } from '@/lib/supabase/middleware';
import { ADMIN_HOME, ADMIN_LOGIN } from '@/lib/validation/auth';

/**
 * First line of defence for /admin: refreshes the session and bounces anyone
 * who is not a signed-in admin. The dashboard layout and every Server Action
 * check again with requireAdmin(), so this is never the only check.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, isAdmin } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === ADMIN_LOGIN;

  if (isLogin) {
    if (isAdmin) return withSessionCookies(NextResponse.redirect(new URL(ADMIN_HOME, request.url)), response);
    return response;
  }

  if (!isAdmin) {
    const loginUrl = new URL(ADMIN_LOGIN, request.url);
    if (userId) loginUrl.searchParams.set('error', 'forbidden');
    else loginUrl.searchParams.set('next', `${pathname}${search}`);
    return withSessionCookies(NextResponse.redirect(loginUrl), response);
  }

  return response;
}

export const config = {
  // Only the dashboard uses auth. Leaving the public showroom out keeps its
  // pages free of per-request auth calls and cacheable.
  matcher: ['/admin', '/admin/:path*'],
};
