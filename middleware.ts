import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const { data: { session }, error } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Log for debugging
  logger.debug('Middleware processing request', {
    path: pathname,
    hasSession: !!session,
    error: error ? error.message : null
  }, request);

  if (error) {
    logger.error('Middleware - Supabase getSession error', { error: error.message }, request);
    // Allow request to proceed or handle error appropriately, for now, proceed
    return res;
  }

  // If no session and trying to access protected routes, redirect to login
  if (!session && (pathname.startsWith('/portal') || pathname.startsWith('/vet') || pathname.startsWith('/book') || pathname.startsWith('/admin'))) {
    logger.info('No session, redirecting to login', { 
      path: pathname,
      redirectTo: '/login'
    }, request);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists, check user role and handle role-based access
  if (session) {
    // Extract user role from auth metadata only
    let userRole = session.user?.user_metadata?.role || session.user?.app_metadata?.role;

    logger.debug('Middleware checking role', { 
      userId: session.user.id,
      role: userRole,
      path: pathname
    }, request);

    // If on login or signup and already authenticated, redirect based on role
    if (pathname === '/login' || pathname === '/signup') {
      let redirectPath = '/portal/bookings';
      if (userRole === 'admin') {
        redirectPath = '/admin';
      } else if (userRole === 'vet') {
        redirectPath = '/vet';
      }

      logger.info('Authenticated user on auth page, redirecting', {
        userId: session.user.id,
        role: userRole,
        redirectPath
      }, request);

      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // Enforce role-based access control
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      logger.warn('Non-admin user attempting to access admin area', {
        userId: session.user.id,
        role: userRole,
        path: pathname
      }, request);

      if (userRole === 'vet') {
        return NextResponse.redirect(new URL('/vet', request.url));
      } else {
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }
    }

    if (pathname.startsWith('/vet') && userRole !== 'vet') {
      logger.warn('Non-vet user attempting to access vet area', {
        userId: session.user.id,
        role: userRole,
        path: pathname
      }, request);

      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }
    }
    
    // Optional: Redirect pet owners away from other portals
    if (pathname.startsWith('/portal') && (userRole === 'admin' || userRole === 'vet')) {
      logger.info('Admin/Vet accessing pet owner portal, redirecting', {
        userId: session.user.id,
        role: userRole,
        path: pathname
      }, request);

      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/vet', request.url));
      }
    }
  }

  return res;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api (API routes, uncomment if you want middleware to skip them for now)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/).*)',
  ],
}; 