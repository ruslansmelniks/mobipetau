import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/.well-known')
  ) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Define route types
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/setup-profile']
  const authRoutes = ['/login', '/register', '/forgot-password']
  const vetRoutes = ['/vet', '/vet/profile', '/vet/appointments', '/vet/availability']
  const petOwnerRoutes = ['/dashboard', '/pets', '/appointments', '/vets']

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthRoute = authRoutes.includes(pathname)
  const isVetRoute = vetRoutes.some(route => pathname.startsWith(route))
  const isPetOwnerRoute = petOwnerRoutes.some(route => pathname.startsWith(route))

  console.log('[Middleware]', {
    pathname,
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.user_metadata?.role || 'unknown'
  })

  // If user is not logged in
  if (!user) {
    // Allow access to public routes
    if (isPublicRoute) {
      return response
    }
    // Prevent redirect loop: don't redirect if already on /login
    if (pathname === '/login') {
      return response
    }
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in
  const userRole = user.user_metadata?.role || null

  // If user has no role, send to setup-profile (but don't loop)
  if (!userRole && pathname !== '/setup-profile') {
    return NextResponse.redirect(new URL('/setup-profile', request.url))
  }
  if (!userRole && pathname === '/setup-profile') {
    return response
  }

  // Redirect away from auth pages if already logged in
  if (isAuthRoute) {
    // Prevent redirect loop: don't redirect if already on the correct page
    if (userRole === 'vet' && pathname !== '/vet') {
      return NextResponse.redirect(new URL('/vet', request.url))
    } else if (userRole === 'pet_owner' && pathname !== '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (!userRole && pathname !== '/setup-profile') {
      return NextResponse.redirect(new URL('/setup-profile', request.url))
    }
    return response
  }

  // Check role-based access
  if (isVetRoute && userRole !== 'vet') {
    if (pathname !== '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (isPetOwnerRoute && userRole !== 'pet_owner') {
    if (pathname !== '/vet') {
      return NextResponse.redirect(new URL('/vet', request.url))
    }
    return response
  }

  // Prevent infinite redirect on /setup-profile
  if (pathname === '/setup-profile' && userRole) {
    if (userRole === 'vet') {
      return NextResponse.redirect(new URL('/vet', request.url))
    } else if (userRole === 'pet_owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

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