import { type NextRequest } from 'next/server'
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
  if (pathname.startsWith('/portal')) {
    if (!user) {
      console.log('[Middleware] No user for protected route, redirecting to login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return Response.redirect(url)
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === '/login' && user) {
    console.log('[Middleware] User already logged in, redirecting to portal')
    const url = request.nextUrl.clone()
    url.pathname = '/portal/bookings'
    return Response.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 