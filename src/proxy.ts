import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function contentSecurityPolicy() {
  const connectSources = ["'self'", 'https:'];
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBaseUrl) {
    try {
      const apiOrigin = new URL(apiBaseUrl).origin;
      const hostname = new URL(apiOrigin).hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        connectSources.push(apiOrigin);
      }
    } catch {
      // Invalid API URLs are handled by the API client; keep the CSP restrictive.
    }
  }

  return `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src ${connectSources.join(' ')};`;
}

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
    const hasAuthCookie = request.cookies.has('villeto_auth');

    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicy(),
  );

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
