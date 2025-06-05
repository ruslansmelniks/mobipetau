import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAppointmentAcceptedEmail, sendTimeProposedEmail, sendAppointmentDeclinedEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
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
      logger.error('Authentication error', { error: authError?.message });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is a vet
    const { data: vetData, error: vetError } = await supabaseAdmin
      .from('users')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (vetError || !vetData || vetData.role !== 'vet') {
      return NextResponse.json({ error: 'Only veterinarians can update appointment status' }, { status: 403 });
    }

    // Parse body
    const { appointmentId, action, proposedDate, proposedTime, message } = await req.json();
    if (!appointmentId || !action) {
      return NextResponse.json({ error: 'Appointment ID and action are required' }, { status: 400 });
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, pet_id, pet_owner_id, date, time_slot, status,
        pets:pet_id (*),
        pet_owner:pet_owner_id (*)
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      logger.error('Appointment not found', { appointmentId, error: appointmentError });
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Prepare for email
    const petOwnerEmail = appointment.pet_owner?.email;
    const petOwnerName = `${appointment.pet_owner?.first_name} ${appointment.pet_owner?.last_name}`;
    const petName = appointment.pets?.name;
    const vetName = `${vetData.first_name} ${vetData.last_name}`;
    const appointmentDate = appointment.date;
    const appointmentTime = appointment.time_slot;

    let updateData: any = { 
      updated_at: new Date().toISOString(),
      vet_id: user.id // Assign the vet to the appointment
    };
    let emailSent = false;

    if (action === 'accept') {
      updateData.status = 'confirmed';
      // Send accepted email
      try {
        if (petOwnerEmail) {
          await sendAppointmentAcceptedEmail(
            petOwnerEmail,
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime
          );
          emailSent = true;
        }
      } catch (emailError) {
        logger.error('Failed to send accepted email notification:', { error: emailError });
      }
    } else if (action === 'decline') {
      updateData.status = 'declined';
      // Send declined email
      try {
        if (petOwnerEmail) {
          await sendAppointmentDeclinedEmail(
            petOwnerEmail,
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime,
            vetName,
            message
          );
          emailSent = true;
        }
      } catch (emailError) {
        logger.error('Failed to send declined email notification:', { error: emailError });
      }
    } else if (action === 'propose') {
      if (!proposedDate || !proposedTime) {
        return NextResponse.json({ error: 'Proposed date and time are required for time proposal' }, { status: 400 });
      }
      updateData.status = 'time_proposed';
      updateData.proposed_date = proposedDate;
      updateData.proposed_time = proposedTime;
      updateData.proposed_message = message || '';
      // Send time proposed email
      try {
        if (petOwnerEmail) {
          await sendTimeProposedEmail(
            petOwnerEmail,
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime,
            proposedDate,
            proposedTime,
            message
          );
          emailSent = true;
        }
      } catch (emailError) {
        logger.error('Failed to send time proposed email notification:', { error: emailError });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update appointment
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    if (updateError) {
      logger.error('Failed to update appointment status', { error: updateError.message });
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    logger.info('Appointment status updated', { 
      appointmentId, 
      action, 
      newStatus: updateData.status,
      emailSent 
    });

    return NextResponse.json({ 
      success: true, 
      status: updateData.status, 
      emailSent 
    });
  } catch (error: any) {
    logger.error('Unexpected error in appointment status update', { error: error.message });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 