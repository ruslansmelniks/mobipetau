import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  
  // List all cookies
  const allCookies = cookieStore.getAll();
  console.log('All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));
  
  // Check for Supabase auth cookies
  const authCookies = allCookies.filter(c => c.name.includes('supabase'));
  
  // Try to get session
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
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  return NextResponse.json({
    authCookies: authCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    sessionExists: !!session,
    sessionError: error?.message,
    userId: session?.user?.id,
  });
} 