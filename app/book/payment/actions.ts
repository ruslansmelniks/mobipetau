'use server'

import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(booking: any) {
  try {
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `MobiPet: ${booking.services[0].name} for ${booking.petName}`,
              description: `Appointment for ${booking.petName} (${booking.petType})`,
            },
            unit_amount: booking.totalAmount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/payment`,
    });

    // Store booking details in your database here
    // ...

    return session.url || '/book/payment';
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return `/book/payment?error=payment_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`;
  }
}