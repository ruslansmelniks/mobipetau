import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Auth logic disabled: see https://github.com/supabase/auth-helpers/issues/653
  // and https://github.com/supabase/auth-helpers/discussions/651
  // Only log the path for debugging
  console.log("Middleware running for path:", request.nextUrl.pathname);
  return NextResponse.next();
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
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 