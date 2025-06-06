import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Define route types
  const publicRoutes = ['/', '/login', '/signup', '/services', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith(`${route}/`))
  
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(path)
  
  const protectedRoutes = ['/portal', '/admin', '/vet']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  logger.debug('Middleware processing request', {
    path,
    hasSession: !!user,
    isPublicRoute,
    isAuthRoute,
    isProtectedRoute,
  }, request)

  // if user is not signed in and the current path is protected, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', path)
    logger.info('Redirecting unauthenticated user to login', { 
      from: path, 
      to: redirectUrl.pathname 
    }, request)
    return NextResponse.redirect(redirectUrl)
  }

  // if user is signed in and the current path is login or signup, redirect to portal
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    
    // Check user role for proper redirect
    const userRole = user.user_metadata?.role || 'pet_owner'
    
    if (userRole === 'admin') {
      redirectUrl.pathname = '/admin'
    } else if (userRole === 'vet') {
      redirectUrl.pathname = '/vet'
    } else {
      redirectUrl.pathname = '/portal/bookings'
    }
    
    logger.info('Redirecting authenticated user away from auth page', {
      userId: user.id,
      from: path,
      to: redirectUrl.pathname
    }, request)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (user && path.startsWith('/admin')) {
    const isAdmin = user.user_metadata?.role === 'admin'
    if (!isAdmin) {
      logger.warn('Non-admin user attempting to access admin area', {
        userId: user.id,
        path
      }, request)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal/bookings'
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (user && path.startsWith('/vet') && !path.startsWith('/vet-')) {
    const isVet = user.user_metadata?.role === 'vet'
    if (!isVet) {
      logger.warn('Non-vet user attempting to access vet area', {
        userId: user.id,
        path
      }, request)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal/bookings'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
} 