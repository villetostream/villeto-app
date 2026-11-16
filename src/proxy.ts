import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders } from './lib/security/headers';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Routes that are not yet implemented — redirect to dashboard
  const comingSoonRoutes = [
    '/cards',
    '/insights',
    '/business-account',
    '/help',
    '/expenses/card-transactions',
    '/expenses/travel'
  ];

  if (comingSoonRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Auth cookie check for dashboard routes
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/pre-onboarding') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/invitation') ||
    pathname.startsWith('/account-confirmation') ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon.ico');

  if (!isPublicPath) {
    const hasAuthCookie =
      request.cookies.has('villeto_auth') ||
      request.cookies.has('villeto_access');

    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Security headers
  const response = NextResponse.next();

  const securityHeaders = getSecurityHeaders({ isPublicPath });
  for (const [headerName, headerValue] of Object.entries(securityHeaders)) {
    response.headers.set(headerName, headerValue);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
