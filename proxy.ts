import { NextResponse, type NextRequest } from 'next/server';
import { SLUG_PATTERN } from '@/lib/slug';
import { isCarGone, updateSession, withSessionCookies } from '@/lib/supabase/middleware';
import { ADMIN_HOME, ADMIN_LOGIN } from '@/lib/validation/auth';

const CAR_PAGE = /^\/cars\/([^/]+)\/?$/;

/**
 * An archived car's page, or one sold more than 30 days ago, is still
 * rendered (it suggests similar cars) but with 410 Gone so search engines
 * drop it. A recently sold car's page answers 200 (see isCarGone). Only full page loads
 * are checked: client-side navigations never show the status, and skipping
 * them saves a database call per click.
 */
async function carPage(request: NextRequest, slug: string) {
  const isDocument =
    (request.method === 'GET' || request.method === 'HEAD') &&
    !request.headers.has('rsc') &&
    !request.headers.has('next-router-prefetch');
  if (isDocument && slug.length <= 120 && SLUG_PATTERN.test(slug) && (await isCarGone(slug))) {
    return NextResponse.rewrite(request.nextUrl, { status: 410 });
  }
  return NextResponse.next();
}

/**
 * First line of defence for /admin: refreshes the session and bounces anyone
 * who is not a signed-in admin. The dashboard layout and every Server Action
 * check again with requireAdmin(), so this is never the only check.
 */
export async function proxy(request: NextRequest) {
  const car = CAR_PAGE.exec(request.nextUrl.pathname);
  if (car) return carPage(request, car[1]);

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
  // pages free of per-request auth calls and cacheable. Car pages come
  // through only for the sold-car status check above.
  matcher: ['/admin', '/admin/:path*', '/cars/:slug'],
};
