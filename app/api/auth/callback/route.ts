import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  console.log('[Auth Callback] Processing callback with code:', code ? 'exists' : 'missing');
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code for session:', error);
        return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin));
      }
      
      if (data.session) {
        console.log('[Auth Callback] Session created successfully for user:', data.session.user.email);
        
        // Determine redirect path based on user role
        const userRole = data.session.user.user_metadata?.role || 'pet_owner';
        const redirectPath = userRole === 'admin' ? '/admin' : 
                            userRole === 'vet' ? '/vet' : 
                            '/portal/bookings';
        
        console.log('[Auth Callback] Redirecting to:', redirectPath);
        return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
      }
    } catch (error) {
      console.error('[Auth Callback] Unexpected error:', error);
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin));
    }
  }
  
  // If no code or other issues, redirect to login
  console.log('[Auth Callback] No code found, redirecting to login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
} 