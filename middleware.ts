import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // CRITICAL: Log the path being checked
  console.log('[Middleware] Checking session for path:', pathname)
  
  // Define public routes that don't need authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/services',
    '/about',
    '/contact',
    '/auth/callback'
  ]
  
  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  // If it's a public route, allow access without checking session
  if (isPublicRoute) {
    console.log('[Middleware] Public route, allowing access:', pathname)
    return NextResponse.next()
  }
  
  // For protected routes, check session
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('[Middleware] Session data:', {
    pathname,
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.user_metadata?.role,
    session: user ? 'exists' : 'null'
  })

  // Protected routes that require authentication
  const protectedRoutes = ['/portal', '/admin', '/vet', '/book']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If accessing protected route without authentication, redirect to login
  if (isProtectedRoute && !user) {
    console.log('[Middleware] No user for protected route, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If authenticated user tries to access login/signup, redirect to appropriate dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const userRole = user.user_metadata?.role || 'pet_owner'
    const redirectPath = userRole === 'admin' ? '/admin' : 
                        userRole === 'vet' ? '/vet' : 
                        '/portal/bookings';
    console.log('[Middleware] Authenticated user on auth page, redirecting to:', redirectPath)
    console.log('[Middleware] User details for redirect:', {
      email: user.email,
      role: userRole,
      redirectPath
    })
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - well-known (for DevTools)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.well-known|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 