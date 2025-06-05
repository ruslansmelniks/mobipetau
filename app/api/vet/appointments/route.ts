import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is a vet
    const { data: vetData, error: vetError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (vetError || !vetData || vetData.role !== 'vet') {
      return NextResponse.json({ error: 'Only veterinarians can access appointments' }, { status: 403 });
    }

    // First, get appointments assigned to this vet
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('vet_id', user.id)
      .order('created_at', { ascending: false });

    if (appointmentsError) {
      logger.error('Error fetching appointments', { error: appointmentsError });
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ appointments: [] });
    }

    // Get unique pet IDs and owner IDs
    const petIds = [...new Set(appointments.map(a => a.pet_id).filter(Boolean))];
    const ownerIds = [...new Set(appointments.map(a => a.pet_owner_id).filter(Boolean))];

    // Fetch pets data
    let petsMap = new Map();
    if (petIds.length > 0) {
      const { data: pets } = await supabaseAdmin
        .from('pets')
        .select('*')
        .in('id', petIds);
      
      if (pets) {
        pets.forEach(pet => petsMap.set(pet.id, pet));
      }
    }

    // Fetch owners data
    let ownersMap = new Map();
    if (ownerIds.length > 0) {
      const { data: owners } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .in('id', ownerIds);
      
      if (owners) {
        owners.forEach(owner => ownersMap.set(owner.id, owner));
      }
    }

    // Combine the data
    const appointmentsWithRelations = appointments.map(appointment => ({
      ...appointment,
      pets: appointment.pet_id ? petsMap.get(appointment.pet_id) : null,
      pet_owner: appointment.pet_owner_id ? ownersMap.get(appointment.pet_owner_id) : null,
    }));

    return NextResponse.json({ appointments: appointmentsWithRelations });

  } catch (error: any) {
    logger.error('Unexpected error in vet appointments API', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 