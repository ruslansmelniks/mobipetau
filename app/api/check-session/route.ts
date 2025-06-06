import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  const allCookies = cookieStore.getAll();
  return NextResponse.json({
    hasSession: !!session,
    error: error?.message,
    user: session?.user?.email,
    cookies: allCookies.map((c: any) => ({
      name: c.name,
      hasValue: !!c.value,
      length: c.value?.length
    }))
  });
} 