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
    const body = await req.json();
    const { petOwnerId } = body;
    
    if (!petOwnerId) {
      return NextResponse.json({ error: 'Pet owner ID is required' }, { status: 400 });
    }
    
    console.log('=== CREATING TEST APPOINTMENT ===');
    console.log('Pet Owner ID:', petOwnerId);
    
    // Create a random pet first
    const petName = getRandomElement(petNames);
    const petType = getRandomElement(petTypes);
    const petBreed = getRandomElement(petBreeds);
    
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .insert({
        name: petName,
        type: petType,
        breed: petBreed,
        pet_owner_id: petOwnerId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (petError) {
      console.error('Error creating pet:', petError);
      return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
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
        type: 'new_appointment',
        message: `New appointment request for ${petName} on ${appointmentDate} at ${timeSlot}`,
        reference_id: appointment.id,
        reference_type: 'appointment',
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
    console.error('Error creating test appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create test appointment' },
      { status: 500 }
    );
  }
} 