import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendAppointmentCompletedEmail } from '@/lib/email-service';
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
      return NextResponse.json({ error: 'Only veterinarians can submit clinical reports' }, { status: 403 });
    }

    // Parse body
    const {
      appointmentId,
      sharedNotes,
      confidentialNotes,
      additionalServices,
      followUpRecommended,
      followUpDate,
      followUpReason,
    } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
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

    // Update appointment status
    await supabase
      .from('appointments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    // Save clinical report
    const { data: report, error: reportError } = await supabase
      .from('clinical_reports')
      .upsert({
        appointment_id: appointmentId,
        pet_id: appointment.pet_id,
        vet_id: user.id,
        date: new Date().toISOString(),
        shared_notes: sharedNotes,
        confidential_notes: confidentialNotes,
        additional_services: additionalServices,
        total_additional_cost: additionalServices?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || 0,
        follow_up_recommended: followUpRecommended,
        follow_up_date: followUpDate,
        follow_up_reason: followUpReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'appointment_id' })
      .select()
      .single();

    if (reportError) {
      logger.error('Failed to create clinical report', { error: reportError.message });
      return NextResponse.json({ error: 'Failed to create clinical report' }, { status: 500 });
    }

    // Email notification
    try {
      const petOwnerArr = appointment.pet_owner as any[];
      const petsArr = appointment.pets as any[];
      await sendAppointmentCompletedEmail(
        petOwnerArr[0]?.email,
        `${petOwnerArr[0]?.first_name} ${petOwnerArr[0]?.last_name}`,
        petsArr[0]?.name,
        appointment.date,
        `${vetData.first_name} ${vetData.last_name}`,
        sharedNotes,
        followUpRecommended && followUpDate ? `Follow-up recommended on ${followUpDate}: ${followUpReason}` : undefined
      );
    } catch (emailError) {
      logger.error('Failed to send completion email', { error: emailError });
    }

    return NextResponse.json({ success: true, report, message: 'Clinical report submitted successfully' });
  } catch (error: any) {
    logger.error('Unexpected error in clinical report submission', { error: error.message });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 