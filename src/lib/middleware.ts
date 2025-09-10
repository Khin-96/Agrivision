// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Check if user is authenticated
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If user is not authenticated and trying to access protected route
    if (!token && pathname.startsWith('/profile')) {
      const url = new URL('/auth', req.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // If user is authenticated and trying to access auth pages
    if (token && pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/market', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // This is a fallback, the main logic is above
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/profile/:path*',
    '/market/:path*',
    '/buy/:path*',
    '/sell/:path*',
    '/auth/:path*',
  ],
};