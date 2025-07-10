import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createNotification } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('=== APPOINTMENT STATUS API DEBUG ===');
  console.log('1. Headers:', Object.fromEntries(req.headers.entries()));
  console.log('2. Method:', req.method);
  try {
    // Try to get the body first
    const body = await req.json();
    console.log('3. Body:', body);
    // Check for authorization header
    const authHeader = req.headers.get('authorization');
    console.log('4. Auth header:', authHeader);
    // Check for custom headers from middleware
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    console.log('5. Middleware headers:', { userId, userRole });
    // Now let's see what's actually causing the 401
    // Add your existing authentication code here but with more logging
    // If you're using the auth header approach:
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('6. FAILING: No valid auth header');
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 });
    }

    if (!userId || userRole !== 'vet') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body (already done above)
    const { appointmentId, status, action, proposedTime, message } = body;

    // Get appointment details first
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('*, pets:pet_id(name), pet_owner:pet_owner_id(*)')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    let newStatus;
    let updateData: any = {};

    switch (action) {
      case 'accept':
        newStatus = 'confirmed';
        updateData = { 
          status: newStatus,
          vet_id: userId,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        break;
      case 'decline':
        newStatus = 'declined';
        updateData = { 
          status: newStatus,
          decline_reason: message || 'Vet declined the appointment',
          updated_at: new Date().toISOString()
        };
        break;
      case 'propose':
        if (!proposedTime) {
          return NextResponse.json({ error: 'Proposed time is required' }, { status: 400 });
        }
        newStatus = 'proposed_time';
        updateData = {
          status: newStatus,
          proposed_time: proposedTime,
          proposed_message: message || `Vet proposed a new time: ${proposedTime}`,
          proposed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update appointment status
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*, pets:pet_id(name), pet_owner:pet_owner_id(*)')
      .single();

    if (updateError) {
      console.error('Error updating appointment status:', updateError);
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    // Create notifications based on action
    try {
      switch (action) {
        case 'accept':
          // Notify pet owner that appointment was accepted
          await createNotification({
            userId: appointment.pet_owner_id,
            type: 'appointment_accepted',
            message: `Your appointment for ${appointment.pets?.name} has been accepted by the veterinarian`,
            referenceId: appointmentId
          });
          break;
        case 'decline':
          // Notify pet owner that appointment was declined
          await createNotification({
            userId: appointment.pet_owner_id,
            type: 'appointment_declined',
            message: `Your appointment for ${appointment.pets?.name} has been declined. Reason: ${message || 'No reason provided'}`,
            referenceId: appointmentId
          });
          break;
        case 'propose':
          // Notify pet owner about proposed time
          await createNotification({
            userId: appointment.pet_owner_id,
            type: 'time_proposed',
            message: `A new time has been proposed for your appointment with ${appointment.pets?.name}: ${proposedTime}`,
            referenceId: appointmentId
          });
          break;
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole operation if notification fails
    }

    console.log('Successfully updated appointment status:', { action, newStatus, appointmentId });

    return NextResponse.json({ success: true, appointment: updatedAppointment });
  } catch (error: any) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment status' },
      { status: 500 }
    );
  }
} 