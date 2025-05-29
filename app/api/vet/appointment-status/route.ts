import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendAppointmentAcceptedEmail, sendTimeProposedEmail, sendAppointmentDeclinedEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vet check
    const { data: vetData, error: vetError } = await supabase
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

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id, pet_id, pet_owner_id, date, time_slot, pets:pet_id (*), pet_owner:pet_owner_id (*)
      `)
      .eq('id', appointmentId)
      .single();
    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Prepare for email
    const petOwnerArr = appointment.pet_owner as any[];
    const petsArr = appointment.pets as any[];
    const petOwnerEmail = petOwnerArr[0]?.email;
    const petOwnerName = `${petOwnerArr[0]?.first_name} ${petOwnerArr[0]?.last_name}`;
    const petName = petsArr[0]?.name;
    const vetName = `${vetData.first_name} ${vetData.last_name}`;
    const appointmentDate = appointment.date;
    const appointmentTime = appointment.time_slot;

    let updateData: any = { updated_at: new Date().toISOString() };
    let emailSent = false;

    if (action === 'accept') {
      updateData.status = 'in_progress';
      // Send accepted email
      try {
        await sendAppointmentAcceptedEmail(
          petOwnerEmail,
          petOwnerName,
          petName,
          appointmentDate,
          appointmentTime
        );
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send accepted email notification:', emailError);
      }
    } else if (action === 'decline') {
      updateData.status = 'declined';
      // Send declined email
      try {
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
      } catch (emailError) {
        console.error('Failed to send declined email notification:', emailError);
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
      } catch (emailError) {
        console.error('Failed to send time proposed email notification:', emailError);
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);
    if (updateError) {
      logger.error('Failed to update appointment status', { error: updateError.message });
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: updateData.status, emailSent });
  } catch (error: any) {
    logger.error('Unexpected error in appointment status update', { error: error.message });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 