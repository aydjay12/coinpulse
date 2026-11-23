import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/portfolio',
    '/connect-wallet',
    '/watchlist',
    '/transactions',
  ];
  const authRoutes = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

  const isAuth = request.cookies.get('coinpulse_auth_token');

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authRoutes.some((route) => pathname.startsWith(route)) && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
