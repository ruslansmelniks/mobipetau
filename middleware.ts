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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // --- Temporary cleanup for malformed cookies ---
  const cookiesToClean = [
    'sb-vhpcosbihfooclhoemoz-auth-token',
    'sb-vhpcosbihfooclhoemoz-auth-token.0',
    'sb-vhpcosbihfooclhoemoz-auth-token.1'
  ];
  cookiesToClean.forEach(cookieName => {
    if (request.cookies.has(cookieName)) {
      const value = request.cookies.get(cookieName)?.value;
      if (value?.startsWith('base64-')) {
        console.log(`[Middleware] Cleaning malformed cookie: ${cookieName}`);
        response.cookies.delete(cookieName);
      }
    }
  });
  // --- End temporary cleanup ---

  // Add debug logging for session check
  console.log('[Middleware] Checking session for path:', request.nextUrl.pathname)
  
  // Get auth cookie for debugging
  const authToken = request.cookies.get('sb-vhpcosbihfooclhoemoz-auth-token')
  const hasAuthCookie = !!authToken?.value
  
  // Debug cookie parsing
  if (authToken?.value) {
    try {
      const [accessToken, refreshToken] = JSON.parse(authToken.value)
      console.log('[Middleware] Parsed tokens:', { 
        hasAccess: !!accessToken, 
        hasRefresh: !!refreshToken,
        accessTokenLength: accessToken?.length || 0
      })
    } catch (e) {
      console.error('[Middleware] Failed to parse auth token:', e)
    }
  }

  // --- Helper: Robustly parse Supabase auth cookie ---
  function getTokensFromCookie(cookieValue: string | undefined): [string, string] | null {
    if (!cookieValue) return null;
    let tokenData = cookieValue;
    // Remove base64- prefix if present
    if (tokenData.startsWith('base64-')) {
      tokenData = tokenData.substring(7);
    }
    try {
      // Try JSON parse first
      if (tokenData.startsWith('[')) {
        const parsed = JSON.parse(tokenData);
        if (Array.isArray(parsed) && parsed.length === 2) return [parsed[0], parsed[1]];
      }
      // Try base64 decode and then JSON parse
      const decoded = Buffer.from(tokenData, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed.length === 2) return [parsed[0], parsed[1]];
    } catch (e) {
      // If all fails, return null
      console.error('[Middleware] Failed to robustly parse auth cookie:', e);
    }
    return null;
  }

  // --- Robust session handling ---
  let session = null;
  let error = null;
  let accessToken = null;
  let refreshToken = null;

  // Parse the cookie and try to set the session from it
  if (authToken?.value) {
    const tokens = getTokensFromCookie(authToken.value);
    if (tokens) {
      [accessToken, refreshToken] = tokens;
      if (accessToken && refreshToken) {
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          console.error('[Middleware] Failed to set session from cookie:', setSessionError);
          response.cookies.delete('sb-vhpcosbihfooclhoemoz-auth-token');
          return NextResponse.redirect(new URL('/login', request.url));
        }
        session = data.session;
      }
    } else {
      console.error('[Middleware] Malformed auth cookie, clearing.');
      response.cookies.delete('sb-vhpcosbihfooclhoemoz-auth-token');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If still no session, try to get it from supabase (for SSR or fallback)
  if (!session) {
    const result = await supabase.auth.getSession();
    session = result.data.session;
    error = result.error;
  }

  // If still no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // --- End robust session handling ---

  const hasSession = !!session && !error
  
  console.log('[Middleware] Session check result:', {
    hasSession,
    hasAuthCookie,
    error: error?.message,
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