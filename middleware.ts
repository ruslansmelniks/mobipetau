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
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
        },
        async setAll(cookiesToSet) {
          for (const { name, value, ...options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options })
          }
        }
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()

  // Get the current path
  const path = request.nextUrl.pathname

  // Log for debugging
  logger.debug('Middleware processing request', {
    path: path,
    hasSession: !!session,
    error: error ? error.message : null
  }, request)

  if (error) {
    logger.error('Middleware - Supabase getSession error', { error: error.message }, request)
    // Allow request to proceed or handle error appropriately, for now, proceed
    return response
  }

  // If user is not signed in and the current path is not /login,
  // redirect the user to /login
  if (!session && path !== '/login') {
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

    // Redirect admins and vets to their respective portals if accessing pet owner routes
    if (path.startsWith('/portal/') && !path.startsWith('/portal/vet') && !path.startsWith('/portal/admin')) {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (userRole === 'vet') {
        return NextResponse.redirect(new URL('/vet', request.url))
      }
    }

    // Redirect vets trying to access admin routes
    if (path.startsWith('/admin') && userRole !== 'admin') {
      logger.warn('Non-admin user attempting to access admin area', {
        userId: session.user.id,
        role: userRole,
        path: path
      }, request)
      return NextResponse.redirect(new URL(userRole === 'vet' ? '/vet' : '/portal/bookings', request.url))
    }

    // Redirect non-vets trying to access vet routes
    if (path.startsWith('/vet') && userRole !== 'vet') {
      logger.warn('Non-vet user attempting to access vet area', {
        userId: session.user.id,
        role: userRole,
        path: path
      }, request)
      return NextResponse.redirect(new URL(userRole === 'admin' ? '/admin' : '/portal/bookings', request.url))
    }
  }

  return response
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 