import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.log('=== DELETE APPOINTMENT START ===');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('AUTH ERROR:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authenticated user:', user.id);

    const { id: appointmentId } = await params;
    
    console.log('DELETE appointment request for ID:', appointmentId);

    // Verify user owns this appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('pet_owner_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      console.log('APPOINTMENT ERROR:', appointmentError);
      return NextResponse.json({ 
        error: 'Appointment not found or access denied' 
      }, { status: 404 });
    }

    console.log('Found appointment to delete:', appointment.id);

    // Delete in correct order: notifications first, then time_proposals, then appointment

    console.log('STEP 1: Deleting related notifications...');
    // Get notifications first to see what exists
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('appointment_id', appointmentId);
    
    console.log('Found notifications to delete:', existingNotifications);

    // Delete notifications
    const { data: deletedNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('appointment_id', appointmentId)
      .select();

    console.log('Deleted notifications result:', deletedNotifications);
    console.log('Notifications deletion error:', notificationsError);

    console.log('STEP 2: Deleting related time proposals...');
    const { data: deletedProposals, error: proposalsError } = await supabase
      .from('time_proposals')
      .delete()
      .eq('appointment_id', appointmentId)
      .select();

    console.log('Deleted proposals:', deletedProposals);
    console.log('Proposals deletion error:', proposalsError);

    console.log('STEP 3: Deleting the appointment...');
    const { data: deletedAppointment, error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('pet_owner_id', user.id)
      .select();

    console.log('Deleted appointment:', deletedAppointment);
    console.log('Appointment deletion error:', deleteError);

    if (deleteError) {
      console.log('APPOINTMENT DELETE ERROR:', JSON.stringify(deleteError, null, 2));
      throw deleteError;
    }

    console.log('=== DELETE APPOINTMENT SUCCESS ===');
    return NextResponse.json({ 
      success: true,
      deletedAppointment,
      deletedProposals,
      deletedNotifications
    });

  } catch (error: any) {
    console.error('=== DELETE APPOINTMENT ERROR ===');
    console.error('Error details:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 