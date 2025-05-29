import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { sendEmail, emailTemplates } from '@/lib/email-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, action, proposedTime, message } = await req.json();
    
    if (!appointmentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
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
        updateData = { status: newStatus };
        break;
      case 'decline':
        newStatus = 'declined';
        updateData = { 
          status: newStatus,
          decline_reason: message || 'Vet declined the appointment'
        };
        break;
      case 'propose':
        if (!proposedTime) {
          return NextResponse.json({ error: 'Proposed time is required' }, { status: 400 });
        }
        newStatus = 'time_proposed';
        updateData = {
          status: newStatus,
          proposed_time: proposedTime,
          proposed_message: message || `Vet proposed a new time: ${proposedTime}`
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*, pets:pet_id(name), pet_owner:pet_owner_id(*)')
      .single();
      
    if (updateError) {
      logger.error('Error updating appointment status', { error: updateError });
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    // Send email notification
    try {
      let emailContent;
      const petOwnerEmail = appointment.pet_owner?.email;
      const petOwnerName = `${appointment.pet_owner?.first_name} ${appointment.pet_owner?.last_name}`;
      const petName = appointment.pets?.name;
      const appointmentDate = appointment.date ? new Date(appointment.date).toLocaleDateString() : 'TBD';
      const appointmentTime = appointment.time_slot || 'TBD';

      switch(action) {
        case 'accept':
          emailContent = emailTemplates.appointmentAccepted(
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime
          );
          break;
        case 'decline':
          emailContent = emailTemplates.appointmentDeclined(
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime,
            'Veterinarian',
            message
          );
          break;
        case 'propose':
          emailContent = emailTemplates.timeProposed(
            petOwnerName,
            petName,
            appointmentDate,
            appointmentTime,
            proposedTime,
            proposedTime,
            message
          );
          break;
      }

      if (emailContent && petOwnerEmail) {
        await sendEmail(petOwnerEmail, emailContent.subject, emailContent.html);
      }
    } catch (emailError) {
      logger.warn('Failed to send email notification', { error: emailError });
      // Don't fail the whole operation if email fails
    }
    
    return NextResponse.json({ success: true, appointment: updatedAppointment });
  } catch (error: any) {
    logger.error('Error in appointment status API', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 