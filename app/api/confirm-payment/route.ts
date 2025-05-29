import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, appointmentId: urlAppointmentId } = body;

    if (!sessionId || !urlAppointmentId) {
      return NextResponse.json({ error: 'Missing session_id or appointment_id' }, { status: 400 });
    }

    // 1. Retrieve Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'] // Expand payment_intent to get its ID if needed
    });

    if (!stripeSession) {
      return NextResponse.json({ error: 'Invalid Stripe session ID.' }, { status: 404 });
    }

    // 2. Validate Stripe Session details
    if (stripeSession.metadata?.appointment_id !== urlAppointmentId) {
      console.error(`Mismatched appointment_id in Stripe metadata. Expected: ${urlAppointmentId}, Found: ${stripeSession.metadata?.appointment_id}`);
      return NextResponse.json({ error: 'Appointment ID mismatch with Stripe session.' }, { status: 400 });
    }

    // Check payment status
    // For 'payment' mode, status is 'complete' when session expires, payment_status is what matters.
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ error: `Payment not successful. Status: ${stripeSession.payment_status}` }, { status: 400 });
    }
    
    const userIdFromStripeMeta = stripeSession.metadata?.user_id;
    // It's good practice to also verify that the userIdFromStripeMeta matches the user_id on the appointment record in DB.

    // 3. Update Supabase Database
    // Fetch the appointment first to ensure it exists and matches the user from Stripe metadata (if available and needed for strict check)
    const { data: appointment, error: fetchError } = await supabaseAdmin
        .from('appointments')
        .select('id, pet_owner_id, status, pet_id, appointment_date, appointment_time') // Changed owner_id to pet_owner_id
        .eq('id', urlAppointmentId)
        // Optionally, also .eq('pet_owner_id', userIdFromStripeMeta) if you want to be absolutely sure and have userIdFromStripeMeta
        .single();

    if (fetchError || !appointment) {
        console.error('Error fetching appointment for confirmation or not found:', fetchError ? JSON.stringify(fetchError, null, 2) : 'Appointment not found');
        return NextResponse.json({ error: 'Appointment not found or could not be verified.' }, { status: 404 });
    }
    
    // Idempotency: If already confirmed, just return success without re-updating
    if (appointment.status === 'confirmed') {
        return NextResponse.json({
            success: true,
            appointmentId: appointment.id,
            message: 'Booking already confirmed.',
            newStatus: appointment.status,
            // Potentially return petName, date, time if you want to display them on client from this response
        });
    }

    // Update appointment status and add Stripe IDs
    const paymentIntent = stripeSession.payment_intent;
    const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;

    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'waiting_for_vet', // Changed from 'confirmed'
        stripe_checkout_session_id: stripeSession.id,
        stripe_payment_intent_id: paymentIntentId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', urlAppointmentId)
      .select('id, status')
      .single();

    if (updateError) {
      console.error("Error updating appointment status in DB:", updateError ? JSON.stringify(updateError, null, 2) : 'Unknown update error');
      // Consider how to handle this: payment is made, but DB update failed.
      // Maybe queue for retry or notify admin.
      return NextResponse.json({ error: 'Payment successful, but failed to update booking status. Please contact support.' }, { status: 500 });
    }
    
    // TODO: Potentially fetch pet name for a richer confirmation message if needed
    // let petName = "your pet";
    // if (appointment.pet_id) { ... fetch pet name ... }

    return NextResponse.json({
      success: true,
      appointmentId: updatedAppointment?.id,
      message: 'Your booking has been successfully confirmed!',
      newStatus: updatedAppointment?.status,
      // petName: petName, // If fetched
      // appointmentDate: appointment.appointment_date, // If needed
      // appointmentTime: appointment.appointment_time, // If needed
    });

  } catch (error: any) {
    console.error("Confirm payment API error:", error.type ? error : JSON.stringify(error, null, 2));
    let errorMessage = 'Could not confirm payment.';
    if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAPIError') {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 