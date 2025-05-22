import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, action, proposedTime, message } = await req.json();
    if (!appointmentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Get the appointment
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*, pets:pet_id(name), pet_owner:pet_owner_id(*)')
      .eq('id', appointmentId)
      .single();
    if (fetchError || !appointment) {
      logger.error('Failed to fetch appointment', { appointmentId, error: fetchError });
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    // Determine new status and notification/email content
    let newStatus;
    let notificationMessage = '';
    let emailSubject = '';
    let emailBody = '';
    switch(action) {
      case 'accept':
        newStatus = 'confirmed';
        notificationMessage = `Your appointment for ${appointment.pets?.name} has been confirmed by the vet.`;
        emailSubject = 'MobiPet: Your Appointment Has Been Confirmed';
        emailBody = `Dear ${appointment.pet_owner?.first_name || 'Pet Owner'},\n\nYour appointment for ${appointment.pets?.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time_slot} has been confirmed by the vet.\n\nYou can log in to your MobiPet account to view the details.\n\nBest regards,\nThe MobiPet Team`;
        break;
      case 'decline':
        newStatus = 'cancelled';
        notificationMessage = `Your appointment for ${appointment.pets?.name} has been declined by the vet. Please book again.`;
        emailSubject = 'MobiPet: Your Appointment Has Been Declined';
        emailBody = `Dear ${appointment.pet_owner?.first_name || 'Pet Owner'},\n\nUnfortunately, your appointment for ${appointment.pets?.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time_slot} has been declined by the vet.\n\nPlease log in to your MobiPet account to book a new appointment.\n\nBest regards,\nThe MobiPet Team`;
        break;
      case 'propose':
        if (!proposedTime) {
          return NextResponse.json({ error: 'Proposed time is required' }, { status: 400 });
        }
        newStatus = 'time_proposed';
        notificationMessage = `The vet has proposed a new time for your appointment with ${appointment.pets?.name}.`;
        emailSubject = 'MobiPet: New Time Proposed for Your Appointment';
        emailBody = `Dear ${appointment.pet_owner?.first_name || 'Pet Owner'},\n\nThe vet has proposed a new time for your appointment with ${appointment.pets?.name}:\n\nNew proposed time: ${proposedTime}\n${message ? `Message from vet: ${message}` : ''}\n\nPlease log in to your MobiPet account to accept or decline this proposal.\n\nBest regards,\nThe MobiPet Team`;
        break;
      case 'start':
        newStatus = 'in_progress';
        notificationMessage = `Your appointment for ${appointment.pets?.name} is now in progress.`;
        emailSubject = 'MobiPet: Your Appointment Has Started';
        emailBody = `Dear ${appointment.pet_owner?.first_name || 'Pet Owner'},\n\nYour appointment for ${appointment.pets?.name} is now in progress.\n\nBest regards,\nThe MobiPet Team`;
        break;
      case 'complete':
        newStatus = 'completed';
        notificationMessage = `Your appointment for ${appointment.pets?.name} has been completed. Check your portal for the vet's report.`;
        emailSubject = 'MobiPet: Your Appointment Has Been Completed';
        emailBody = `Dear ${appointment.pet_owner?.first_name || 'Pet Owner'},\n\nYour appointment for ${appointment.pets?.name} has been completed. You can now view the vet's report in your MobiPet account.\n\nBest regards,\nThe MobiPet Team`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    // Update appointment
    const updateData: any = { status: newStatus };
    if (action === 'propose') {
      updateData.proposed_time = proposedTime;
      updateData.proposed_message = message || null;
    }
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);
    if (updateError) {
      logger.error('Failed to update appointment', { appointmentId, error: updateError });
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }
    // Create notification
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: appointment.pet_owner_id,
        message: notificationMessage,
        type: action,
        reference_id: appointmentId,
        reference_type: 'appointment',
        read: false
      });
    if (notifError) {
      logger.warn('Failed to create notification', { error: notifError });
    }
    // Send email notification
    try {
      const emailResult = await fetch(`${req.nextUrl.origin}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appointment.pet_owner_id,
          type: action,
          title: emailSubject,
          message: emailBody,
          appointmentId,
        }),
      });
      if (!emailResult.ok) {
        logger.warn('Failed to send email notification', { status: emailResult.status });
      }
    } catch (emailError) {
      logger.warn('Error sending email notification', { error: emailError });
    }
    // Return success
    return NextResponse.json({
      success: true,
      appointmentId,
      newStatus,
      message: `Appointment ${newStatus} successfully`
    });
  } catch (error: any) {
    logger.error('Error in appointment status API', { error: error.message });
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
} 