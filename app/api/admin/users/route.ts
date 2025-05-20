import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    // Create a server-side Supabase client with the user's session cookies
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
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Debugging logs
    console.log('Admin API called, session:', session?.user?.email);
    console.log('User role:', session?.user?.user_metadata?.role);
    // Check if user is admin via metadata
    const userRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    // Use the service role key for admin operations (bypassing RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // Fetch users
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 