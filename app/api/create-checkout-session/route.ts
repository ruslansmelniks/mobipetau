import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';

type ErrorResponse = {
  error: string;
  details?: any;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: NextRequest) {
  try {
    const { amount, appointmentId } = await req.json();
    console.log("Creating checkout session:", { appointmentId, amount });
    if (!appointmentId) {
      console.error("Missing appointmentId in request");
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      console.error("Invalid amount:", amount);
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return req.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        pet_id,
        services,
        date,
        time_slot,
        pets (name, type)
      `)
      .eq('id', appointmentId)
      .single();
    if (appointmentError) {
      console.error("Error fetching appointment details:", appointmentError);
    }
    let description = "MobiPet Veterinary Services";
    let petName = '';
    if (appointment?.pets) {
      if (Array.isArray(appointment.pets) && appointment.pets.length > 0) {
        const firstPet = appointment.pets[0];
        if (firstPet && typeof firstPet === 'object' && 'name' in firstPet) {
          petName = (firstPet as { name: string }).name;
        }
      } else if (typeof appointment.pets === 'object' && !Array.isArray(appointment.pets) && (appointment.pets as any).name) {
        petName = (appointment.pets as any).name;
      }
    }
    if (petName) {
      description = `Vet appointment for ${petName}`;
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'MobiPet Vet Appointment',
              description: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/book/payment`,
      metadata: {
        appointmentId
      }
    });
    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to create checkout session'
    };
    if (error.type === 'StripeInvalidRequestError') {
      errorResponse.error = `Stripe error: ${error.message}`;
      errorResponse.details = {
        type: error.type,
        code: error.code,
        param: error.param
      };
    } else if (error.message) {
      errorResponse.error = error.message;
    }
    console.error('Detailed error:', errorResponse);
    return NextResponse.json(errorResponse, { status: 400 });
  }
}