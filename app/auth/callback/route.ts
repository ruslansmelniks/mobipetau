import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/portal/bookings'

  logger.info('Auth callback received', { 
    hasCode: !!code,
    redirectTo,
    path: requestUrl.pathname
  })

  if (!code) {
    logger.warn('Auth callback called without code parameter')
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      logger.error('Failed to exchange code for session', { error: exchangeError })
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Get the session to determine user role
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      logger.error('Failed to get session after code exchange', { error: sessionError })
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    if (!session) {
      logger.error('No session found after code exchange')
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    const userRole = session.user.user_metadata?.role || 'pet_owner'
    let finalRedirect = redirectTo
    
    if (userRole === 'admin' && !redirectTo.startsWith('/admin')) {
      finalRedirect = '/admin'
    } else if (userRole === 'vet' && !redirectTo.startsWith('/vet')) {
      finalRedirect = '/vet'
    }

    logger.info('Auth callback successful, redirecting', {
      userId: session.user.id,
      role: userRole,
      redirectTo: finalRedirect
    })

    return NextResponse.redirect(new URL(finalRedirect, requestUrl.origin))
  } catch (error) {
    logger.error('Auth callback error', { error })
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
} 