import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[Middleware] Checking session for path:', pathname)

  const { supabaseResponse, user } = await updateSession(request)

  console.log('[Middleware] Session data:', {
    pathname,
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.user_metadata?.role,
    session: user ? 'exists' : 'null'
  })

  // Protected routes
  if (pathname.startsWith('/portal') || pathname.startsWith('/book')) {
    if (!user) {
      console.log('[Middleware] No user for protected route, redirecting to login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return Response.redirect(url)
    }
  }

  // Debug logging for /book route
  if (pathname.startsWith('/book')) {
    console.log('[Middleware] Book route accessed', {
      hasUser: !!user,
      userRole: user?.user_metadata?.role,
      fullPath: pathname
    });
  }

  // Redirect logged-in users away from login or signup page
  if (user && (pathname === '/login' || pathname === '/signup')) {
    // Check if there's a redirect parameter
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    // If user was trying to access /book, redirect them there
    if (redirectTo === '/book') {
      return Response.redirect(new URL('/book', request.url))
    }
    // Otherwise, redirect based on user role
    const userRole = user.user_metadata?.role || 'pet_owner'
    let redirectPath = '/portal/bookings' // default for pet owners
    if (userRole === 'admin') {
      redirectPath = '/admin'
    } else if (userRole === 'vet') {
      redirectPath = '/vet'
    }
    return Response.redirect(new URL(redirectPath, request.url))
  }

  // If user is authenticated, set custom headers for downstream API routes
  if (user) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email || '')
    requestHeaders.set('x-user-role', user.user_metadata?.role || '')
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - Chrome DevTools specific files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$|.well-known).*)',
  ],
} 