import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
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
        async getAll() {
          const cookiesList = await request.cookies.getAll()
          return cookiesList.map(({ name, value }) => ({ name, value }))
        },
        async setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Add debug logging for session check
  console.log('[Middleware] Checking session for path:', request.nextUrl.pathname)
  const { data: { session }, error } = await supabase.auth.getSession()
  // Add manual cookie check as fallback
  const authToken = request.cookies.get('sb-vhpcosbihfooclhoemoz-auth-token')
  const hasAuthCookie = !!authToken?.value
  const hasSession = session || hasAuthCookie
  console.log('[Middleware] Session check result:', {
    hasSession: !!session,
    hasAuthCookie,
    error,
    sessionUser: session?.user?.email,
    cookies: request.cookies.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' }))
  })

  // Get the current path
  const path = request.nextUrl.pathname

  // Skip middleware for API routes and static files
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.includes('.') ||
    path.startsWith('/.well-known') ||
    path.startsWith('/book')
  ) {
    return NextResponse.next()
  }

  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/services',
    '/forgot-password',
    '/reset-password',
    '/vet-waitlist'
  ]

  // Check if the current path is public
  const isPublicPath = publicPaths.some(publicPath => path === publicPath)

  // Log for debugging
  logger.debug('Middleware processing request', {
    path: path,
    hasSession: hasSession,
    isPublicPath: isPublicPath,
    error: error ? error.message : null
  }, request)

  // Temporary fix: Allow portal access if auth cookie exists
  if (hasAuthCookie && (path.startsWith('/portal/') || path.startsWith('/book/'))) {
    return NextResponse.next()
  }

  if (error) {
    logger.error('Middleware - Supabase getSession error', { error: error.message }, request)
    // Allow request to proceed or handle error appropriately, for now, proceed
    return response
  }

  // If user is not signed in and the current path is not public,
  // redirect the user to /login
  if (!hasSession && !isPublicPath) {
    logger.info('No session, redirecting to login', { 
      path: path,
      redirectTo: '/login'
    }, request)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is signed in and the current path is /login,
  // redirect the user to /portal/bookings
  if (session && path === '/login') {
    logger.info('Authenticated user on auth page, redirecting', {
      userId: session.user.id,
      redirectPath: '/portal/bookings'
    }, request)
    return NextResponse.redirect(new URL('/portal/bookings', request.url))
  }

  // If user is signed in and trying to access /portal/* without proper role
  if (session && path.startsWith('/portal/')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userRole = profile?.role || 'pet_owner'

    // Allow access to portal routes based on role
    if (path.startsWith('/portal/vet') && userRole !== 'vet') {
      logger.warn('Non-vet user attempting to access vet area', {
        userId: session.user.id,
        role: userRole,
        path: path
      }, request)
      return NextResponse.redirect(new URL('/portal/bookings', request.url))
    }

    // Enforce role-based access control
    if (path.startsWith('/portal') && userRole !== 'admin') {
      logger.warn('Non-admin user attempting to access admin area', {
        userId: session.user.id,
        role: userRole,
        path: path
      }, request)
      return NextResponse.redirect(new URL('/portal/bookings', request.url))
    }

    // Optional: Redirect pet owners away from other portals
    if (path.startsWith('/portal') && (userRole === 'admin' || userRole === 'vet')) {
      logger.info('Admin/Vet accessing pet owner portal, redirecting', {
        userId: session.user.id,
        role: userRole,
        path: path
      }, request)
      return NextResponse.redirect(new URL('/portal/bookings', request.url))
    }
  }

  return response
}

// Only run middleware on specific paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
} 