import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Random pet names
const petNames = ['Buddy', 'Max', 'Luna', 'Charlie', 'Bella', 'Cooper', 'Lucy', 'Rocky', 'Daisy', 'Bear'];
const petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster'];
const petBreeds = ['Golden Retriever', 'Labrador', 'Persian', 'Siamese', 'Budgie', 'Holland Lop', 'Syrian'];

// Random addresses in Perth
const addresses = [
  '123 Perth Street, Perth WA 6000',
  '456 Swan River Drive, Perth WA 6000',
  '789 Kings Park Road, Perth WA 6005',
  '321 Northbridge Lane, Perth WA 6003',
  '654 Fremantle Way, Perth WA 6160'
];

// Random time slots
const timeSlots = [
  '06:00 - 08:00 AM',
  '08:00 - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 - 02:00 PM',
  '02:00 - 04:00 PM',
  '04:00 - 06:00 PM',
  '06:00 - 08:00 PM'
];

// Random services
const services = [
  { name: 'Vaccination', price: 85 },
  { name: 'Health Check', price: 65 },
  { name: 'Dental Cleaning', price: 120 },
  { name: 'Microchipping', price: 45 },
  { name: 'Emergency Care', price: 150 }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(): string {
  const today = new Date();
  const futureDate = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within 30 days
  return futureDate.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== CREATING TEST APPOINTMENT ===');

    // Get user info from headers (set by middleware)
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    console.log('User ID from header:', userId, 'Role:', userRole);

    if (!userId || userRole !== 'pet_owner') {
      return NextResponse.json({ error: 'Only pet owners can create test appointments' }, { status: 403 });
    }

    // Use userId as petOwnerId
    const petOwnerId = userId;

    // Create a random pet first
    const petName = getRandomElement(petNames);
    const petType = getRandomElement(petTypes);
    const petBreed = getRandomElement(petBreeds);
    const age = Math.floor(Math.random() * 12) + 1;

    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .insert({
        owner_id: petOwnerId,
        name: petName,
        type: petType,
        breed: petBreed,
        age: age,
        age_unit: 'years',
        weight: Math.floor(Math.random() * 30) + 5,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        desexed: Math.random() > 0.5 ? 'yes' : 'no',
        microchip: Math.random() > 0.7 ? `MC${Math.floor(Math.random() * 1000000)}` : null,
        image: null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (petError) {
      console.error('Error creating pet:', petError);
      return NextResponse.json({ error: 'Failed to create pet', details: petError }, { status: 500 });
    }

    console.log('Created pet:', pet);

    // Create random appointment details
    const appointmentDate = getRandomDate();
    const timeSlot = getRandomElement(timeSlots);
    const address = getRandomElement(addresses);
    const selectedServices = [getRandomElement(services), getRandomElement(services)]; // 2 random services
    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

    // Create the appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        pet_owner_id: petOwnerId,
        pet_id: pet.id,
        date: appointmentDate,
        time_slot: timeSlot,
        address: address,
        status: 'waiting_for_vet',
        services: selectedServices,
        total_price: totalPrice,
        additional_info: `Test appointment for ${petName} - ${Math.random().toString(36).substring(7)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      return NextResponse.json({ error: 'Failed to create appointment', details: appointmentError }, { status: 500 });
    }

    console.log('Created appointment:', appointment);

    // Create notifications for all vets
    const { data: vets } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'vet')
      .eq('is_enabled', true);

    if (vets && vets.length > 0) {
      const notifications = vets.map((vet: any) => ({
        user_id: vet.id,
        type: 'new_appointment', // Always set type for vet
        message: `New appointment request for ${pet.name} on ${appointmentDate} at ${timeSlot}`,
        appointment_id: appointment.id,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} notifications for vets`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test appointment created successfully',
      appointment: {
        id: appointment.id,
        pet: pet,
        date: appointmentDate,
        time: timeSlot,
        address: address,
        services: selectedServices,
        totalPrice: totalPrice
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 