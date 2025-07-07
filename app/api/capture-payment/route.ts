import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { appointmentId } = await req.json();

    // Verify the appointment exists and has a payment intent
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select('*, stripe_payment_intent_id, payment_status')
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Handle legacy appointments (before manual capture)
    if (appointment.payment_status === 'captured' || appointment.payment_status === 'paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already captured',
        legacy: true 
      });
    }

    if (!appointment.stripe_payment_intent_id) {
      return NextResponse.json({ 
        error: 'No payment intent found - this might be a legacy appointment' 
      }, { status: 400 });
    }

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      appointment.stripe_payment_intent_id
    );

    // Update appointment status
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'completed',
        payment_status: 'captured',
        completed_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      paymentIntent,
      message: 'Payment captured successfully' 
    });
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture payment' },
      { status: 500 }
    );
  }
} 