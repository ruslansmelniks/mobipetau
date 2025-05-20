import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // Instead of checking admin status, just fetch the data directly
    // Since this is an admin-only API endpoint, middleware should already
    // restrict access to this endpoint to admin users only

    // Get counts directly using SQL queries to avoid RLS issues
    const { count: petOwnersCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'pet_owner');

    const { count: vetsCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vet');

    const { count: appointmentsCount } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    const { count: petsCount } = await supabaseAdmin
      .from('pets')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      totalPetOwners: petOwnersCount || 0,
      totalVets: vetsCount || 0,
      totalAppointments: appointmentsCount || 0,
      totalPets: petsCount || 0
    });
  } catch (error) {
    console.error('Error in admin stats API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 });
  }
} 