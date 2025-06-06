import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // Verify session was created
  const { data: { session } } = await supabase.auth.getSession();
  
  return NextResponse.json({
    success: true,
    userId: data.user?.id,
    sessionExists: !!session,
    sessionUserId: session?.user?.id,
  });
} 