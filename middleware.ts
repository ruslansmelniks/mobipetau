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
  if (!session && (pathname.startsWith('/portal') || pathname.startsWith('/vet') || pathname.startsWith('/book'))) {
    console.log('Middleware: No session, redirecting to /login from protected route:', pathname);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: pass redirect info
    return NextResponse.redirect(loginUrl);
  }

  // If session exists and user is on public auth pages (login, signup), redirect to a default portal page
  if (session && (pathname === '/login' || pathname === '/signup')) {
    // TODO: Implement role-based redirection if necessary
    // const userRole = session.user?.user_metadata?.role;
    // if (userRole === 'vet') {
    //   console.log('Middleware: Session exists, vet user on auth page, redirecting to /vet');
    //   return NextResponse.redirect(new URL('/vet', request.url));
    // }
    console.log('Middleware: Session exists, user on auth page, redirecting to /portal/bookings');
    return NextResponse.redirect(new URL('/portal/bookings', request.url));
  }
  
  // TODO: Add role-based access control for /vet vs /portal if needed
  // Example: if trying to access /vet but role is not vet, redirect or show unauthorized
  // const userRole = session.user?.user_metadata?.role;
  // if (pathname.startsWith('/vet') && userRole !== 'vet') {
  //   console.log('Middleware: Non-vet user trying to access /vet, redirecting');
  //   return NextResponse.redirect(new URL('/portal/bookings', request.url)); // Or an unauthorized page
  // }

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