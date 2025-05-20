import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const { data: { session }, error } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Log for debugging
  console.log(
    `Middleware: Path: ${pathname}, Session: ${session ? 'Exists' : 'None'}, Error: ${error ? error.message : 'None'}`
  );

  if (error) {
    console.error('Middleware - Supabase getSession error:', error);
    // Allow request to proceed or handle error appropriately, for now, proceed
    return res;
  }

  // If no session and trying to access protected routes, redirect to login
  if (!session && (pathname.startsWith('/portal') || pathname.startsWith('/vet') || pathname.startsWith('/book') || pathname.startsWith('/admin'))) {
    console.log('Middleware: No session, redirecting to /login from protected route:', pathname);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: pass redirect info
    return NextResponse.redirect(loginUrl);
  }

  // If session exists, check user role and handle role-based access
  if (session) {
    // Extract user role from auth metadata or from user table
    // First try to get from user_metadata
    let userRole = session.user?.user_metadata?.role;
    
    // If not in user_metadata, we need to fetch from the database
    if (!userRole) {
      try {
        // Fetch the user's role from the users table
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (!error && data) {
          userRole = data.role;
          console.log('Middleware: Fetched user role from DB:', userRole);
        }
      } catch (e) {
        console.error('Middleware: Error fetching user role:', e);
      }
    }

    // If on login or signup and already authenticated, redirect based on role
    if (pathname === '/login' || pathname === '/signup') {
      if (userRole === 'admin') {
        console.log('Middleware: Admin user on auth page, redirecting to /admin');
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (userRole === 'vet') {
        console.log('Middleware: Vet user on auth page, redirecting to /vet');
        return NextResponse.redirect(new URL('/vet', request.url));
      } else {
        console.log('Middleware: Pet owner on auth page, redirecting to /portal/bookings');
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }
    }

    // Enforce role-based access control
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      console.log('Middleware: Non-admin user trying to access /admin, redirecting');
      if (userRole === 'vet') {
        return NextResponse.redirect(new URL('/vet', request.url));
      } else {
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }
    }

    if (pathname.startsWith('/vet') && userRole !== 'vet') {
      console.log('Middleware: Non-vet user trying to access /vet, redirecting');
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }
    }
    
    // Optional: Redirect pet owners away from other portals
    if (pathname.startsWith('/portal') && (userRole === 'admin' || userRole === 'vet')) {
      console.log('Middleware: Admin/Vet trying to access pet owner portal, redirecting');
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