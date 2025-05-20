import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Create a server-side Supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  try {
    // Get the session information
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 401 });
    }
    
    if (!data.session) {
      return NextResponse.json({ 
        message: 'No active session found' 
      }, { status: 401 });
    }
    
    // Return user data and metadata
    return NextResponse.json({
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        user_metadata: data.session.user.user_metadata,
        app_metadata: data.session.user.app_metadata,
      },
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ 
      error: 'Session debug failed',
      details: String(error)
    }, { status: 500 });
  }
} 