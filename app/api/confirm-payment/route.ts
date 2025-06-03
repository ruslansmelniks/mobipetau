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
    
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
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
        status: 'confirmed',
        payment_status: 'paid',
        stripe_session_id: sessionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    console.log('Payment confirmed and appointment updated:', {
      appointmentId,
      sessionId,
      status: appointment.status
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
} 