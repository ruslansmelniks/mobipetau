import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  const { amount, appointmentDetails } = await req.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Vet Appointment',
            description: appointmentDetails,
          },
          unit_amount: amount * 100, // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${req.nextUrl.origin}/book/success`,
    cancel_url: `${req.nextUrl.origin}/book/cancel`,
  });

  return NextResponse.json({ url: session.url });
}