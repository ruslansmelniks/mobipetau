import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // Get the auth token from the request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header found');
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log('Fetching appointments for user:', user.id);

    // Fetch appointments using service role (bypasses RLS)
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('pet_owner_id', user.id)
      .neq('status', 'pending')
      .order('created_at', { ascending: false });

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch appointments', 
        details: appointmentsError.message 
      }, { status: 500 });
    }

    console.log('Found appointments:', appointments?.length || 0);

    // Fetch pets if there are appointments
    let pets = {};
    if (appointments && appointments.length > 0) {
      const petIds = [...new Set(appointments.map(a => a.pet_id).filter(Boolean))];
      
      if (petIds.length > 0) {
        const { data: petsData, error: petsError } = await supabaseAdmin
          .from('pets')
          .select('*')
          .in('id', petIds);
        
        if (petsError) {
          console.error('Error fetching pets:', petsError);
          // Don't fail the whole request if pets fail
        } else if (petsData) {
          pets = Object.fromEntries(petsData.map(pet => [pet.id, pet]));
        }
      }
    }

    return NextResponse.json({ 
      appointments: appointments || [], 
      pets 
    });
  } catch (error: any) {
    console.error('Unexpected error in appointments API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 });
  }
} 