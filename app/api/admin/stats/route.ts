import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
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
    // Verify admin status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Use admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Run all queries in parallel using raw SQL instead of the query builder
    // This avoids triggering the RLS policies
    const getPetOwnersCount = supabaseAdmin.rpc('get_pet_owners_count');
    const getVetsCount = supabaseAdmin.rpc('get_vets_count');
    const getAppointmentsCount = supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true });
    const getPetsCount = supabaseAdmin.from('pets').select('*', { count: 'exact', head: true });
    
    const [petOwnersResult, vetsResult, appointmentsResult, petsResult] = await Promise.all([
      getPetOwnersCount,
      getVetsCount,
      getAppointmentsCount,
      getPetsCount
    ]);
    
    return NextResponse.json({
      totalPetOwners: petOwnersResult.data || 0,
      totalVets: vetsResult.data || 0,
      totalAppointments: appointmentsResult.count || 0,
      totalPets: petsResult.count || 0
    });
  } catch (error) {
    console.error('Error in admin stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 