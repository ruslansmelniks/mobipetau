import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil', // Reverted to original API version
});

// Initialize Supabase Admin Client
// Ensure these environment variables are set in your Vercel/server environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      amount, // Expected in dollars from client
      userId,
      description,
      customer_email
    } = body;

    // Validate required fields from the client
    if (!appointmentId || typeof amount !== 'number' || !userId || !customer_email) {
      return NextResponse.json({ error: 'Missing required payment details.' }, { status: 400 });
    }

    // 1. Fetch the appointment from Supabase to validate
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, pet_owner_id, total_price, status')
      .eq('id', appointmentId)
      .eq('pet_owner_id', userId)
      .single();

    if (fetchError || !appointment) {
      console.error('Error fetching appointment for payment creation or appointment not found:', fetchError ? JSON.stringify(fetchError, null, 2) : 'Appointment not found');
      return NextResponse.json({ error: 'Invalid appointment or unable to verify booking.' }, { status: 404 });
    }

    // 2. Validate the amount (total_price is stored in dollars, Stripe expects cents)
    // Perform a tolerance check for potential floating point inaccuracies if necessary
    const expectedAmountInCents = Math.round(appointment.total_price! * 100);
    const receivedAmountInCents = Math.round(amount * 100);

    if (expectedAmountInCents !== receivedAmountInCents) {
      console.error(`Price mismatch for appointment ${appointmentId}. Expected: ${expectedAmountInCents}, Received: ${receivedAmountInCents}`);
      return NextResponse.json({ error: 'Payment amount mismatch. Please try again.' }, { status: 400 });
    }
    
    // 3. Validate appointment status (e.g., it should be in a state ready for payment)
    // Example: Allow payment if status is 'pending_confirmation' or 'processing_payment'
    if (!['pending_confirmation', 'processing_payment'].includes(appointment.status)) {
        console.error(`Invalid status for payment for appointment ${appointmentId}. Status: ${appointment.status}`);
        return NextResponse.json({ error: 'This booking is not currently in a state that allows payment.' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/book/payment?appointment_id=${appointmentId}`; // Or redirect to a general booking page

    // 4. Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: description || `MobiPet Vet Booking #${appointmentId.substring(0,8)}`,
              // You can add more details here, or even images if Stripe supports it for your setup
              // images: [`${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`], 
            },
            unit_amount: expectedAmountInCents, // Use the validated amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customer_email, // Pre-fill customer email
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        appointment_id: appointmentId,
        user_id: userId,
      },
      // To ensure the payment is completed before fulfilling the order, you might set payment_intent_data
      // payment_intent_data: {
      //   setup_future_usage: 'off_session', // If you want to save card for later
      // },
    });

    if (!session.id) {
        throw new Error('Stripe session ID not found after creation.');
    }

    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error("Stripe session creation error:", error.type ? error : JSON.stringify(error, null, 2));
    // Default error message
    let errorMessage = 'Could not create payment session.';
    if (error.type === 'StripeCardError') {
        errorMessage = error.message; // More specific error from Stripe
    }
    // Add more specific Stripe error handling if needed based on error.type
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}