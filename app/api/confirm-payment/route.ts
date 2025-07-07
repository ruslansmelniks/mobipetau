import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { sessionId, appointmentId } = await req.json();

    if (!sessionId || !appointmentId) {
      return NextResponse.json(
        { error: 'Missing session ID or appointment ID' },
        { status: 400 }
      );
    }

    console.log('Confirming payment:', {
      sessionId,
      appointmentId
    });

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // For manual capture, the status will be 'unpaid' until captured
    // Check if payment_intent exists instead
    if (!session || !session.payment_intent) {
      return NextResponse.json(
        { error: 'Payment session invalid' },
        { status: 400 }
      );
    }

    // Verify the payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );

    // For manual capture, status should be 'requires_capture' after successful authorization
    if (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded') {
      console.error('Invalid payment intent status:', paymentIntent.status);
      return NextResponse.json(
        { error: 'Payment authorization failed' },
        { status: 400 }
      );
    }

    // Verify the appointment ID matches
    if (session.metadata?.appointmentId !== appointmentId) {
      console.error('Appointment ID mismatch:', {
        sessionAppointmentId: session.metadata?.appointmentId,
        providedAppointmentId: appointmentId
      });
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    // Update appointment status
    const { data: appointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'waiting_for_vet',
        payment_status: 'authorized', // Changed from 'paid' to 'authorized'
        stripe_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment status' },
        { status: 500 }
      );
    }

    console.log('Payment confirmed and appointment updated:', {
      appointmentId,
      sessionId,
      status: appointment.status
    });

    // Return success response with appointment details
    return NextResponse.json({ 
      success: true,
      appointment,
      appointmentId,
      message: 'Your booking has been confirmed and payment authorized!',
      newStatus: appointment.status,
      petName: appointment.pets?.name,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time_slot
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
} 