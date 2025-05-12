"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { loadStripe } from '@stripe/stripe-js'
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import React from 'react'

const services = [
  {
    id: "1",
    title: "After hours home visit",
    description: "A qualified vet will be prioritised to come to urgently assist your pet in the event of an emergency",
    price: 299,
  },
  {
    id: "2",
    title: "At-Home Peaceful Euthanasia",
    description:
      "A compassionate, gentle farewell for your pet in the comfort and familiarity of home, ensuring their final moments are peaceful and surrounded by loved ones",
    price: 599,
  },
];

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentDetails() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [bookingSummary, setBookingSummary] = useState<any>(null)
  const [missingData, setMissingData] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [missingDraft, setMissingDraft] = useState(false)

  useEffect(() => {
    setHasMounted(true);
    if (!user) return;
    setError(null);
    setMissingDraft(false);
    const fetchDraftAppointment = async () => {
      const { data: draft, error: fetchError } = await supabase
        .from('appointments')
        .select(`*, pets (*), services`)
        .eq('pet_owner_id', user.id)
        .eq('status', 'pending')
        .single();
      if (fetchError) {
        setError('Failed to fetch draft appointment. Please try again.');
        return;
      }
      if (!draft) {
        setMissingDraft(true);
        setTimeout(() => {
          router.replace('/book');
        }, 2000);
        return;
      }
      setDraftId(draft.id);
      const selectedServices = services.filter(s => draft.services.includes(s.id));
      const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
      setBookingSummary({
        pet: draft.pets,
        services: selectedServices,
        appointment: {
          date: draft.date ? new Date(draft.date).toLocaleDateString() : '',
          time: draft.time_slot,
          address: draft.address,
          additionalInfo: draft.additional_info,
          issueDescription: draft.notes,
        },
        totalPrice,
      });
      if (!draft.pets || !draft.services || !draft.date || !draft.time_slot || !draft.address) {
        setMissingData(true);
      } else {
        setMissingData(false);
      }
    };
    fetchDraftAppointment();
  }, [user, hasMounted]);

  const handlePayment = async () => {
    if (!draftId || !bookingSummary) return;
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: draftId,
          amount: bookingSummary.totalPrice,
        }),
      });
      if (!response.ok) {
        setError('Failed to create checkout session. Please try again.');
        setIsProcessing(false);
        return;
      }
      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      setError('Error creating checkout session. Please try again.');
      console.error('Error creating checkout session:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!draftId) return;
    if (!window.confirm('Are you sure you want to cancel this booking? This cannot be undone.')) return;
    setIsCancelling(true);
    await supabase.from('appointments').delete().eq('id', draftId);
    setIsCancelling(false);
    router.replace('/portal/bookings');
  };

  if (!hasMounted) {
    return null;
  }

  if (!bookingSummary) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-teal-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  if (missingData) {
    return (
      <div className="max-w-3xl mx-auto mt-12 bg-white p-8 rounded-lg border text-center">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Some details are missing</h2>
        <p className="mb-6">Please complete all steps before proceeding to payment.</p>
        <Button asChild className="bg-[#4e968f] hover:bg-[#43847e]">
          <Link href="/book">Go to Start</Link>
        </Button>
      </div>
    );
  }

  if (missingDraft) {
    return (
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4 text-center">
        Your booking draft was not found. Redirecting to start...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <Link href="/" className="flex justify-center md:justify-start">
            <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="payment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Confirm appointment details</h1>
          <p className="text-center text-gray-600 mb-8">Review your appointment and proceed to payment.</p>

          <div className="space-y-6">
            {/* Appointment Summary */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-6">Review your appointment</h2>
              <div className="flex items-center gap-4 pb-6 border-b">
                {bookingSummary.pet.image && (
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border">
                    <Image
                      src={bookingSummary.pet.image || "/placeholder.svg"}
                      alt={bookingSummary.pet.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{bookingSummary.pet.name}</h3>
                  <p className="text-gray-500">{bookingSummary.pet.species}</p>
                </div>
              </div>

              {/* Services */}
              <div className="py-6 border-b">
                <div className="flex items-center mb-2">
                  <Check className="h-5 w-5 text-teal-500 mr-2" />
                  <span className="font-medium">Service(s)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  {bookingSummary.services.map((service: any, idx: any) => (
                    <React.Fragment key={idx}>
                      <span>{service.title}</span>
                      <span className="text-right font-medium">${service.price}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Issue Description */}
              {bookingSummary.appointment.issueDescription && (
                <div className="py-6 border-b">
                  <div className="flex items-center mb-2">
                    <Check className="h-5 w-5 text-teal-500 mr-2" />
                    <span className="font-medium">Issue Description</span>
                  </div>
                  <p className="text-gray-700">{bookingSummary.appointment.issueDescription}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="py-6 border-b grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-teal-500 mr-2 mt-1" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-gray-700">{bookingSummary.appointment.date}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-teal-500 mr-2 mt-1" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-gray-700">{bookingSummary.appointment.time}</p>
                  </div>
                </div>
                <div className="flex items-start md:col-span-2">
                  <MapPin className="h-5 w-5 text-teal-500 mr-2 mt-1" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-700">{bookingSummary.appointment.address}</p>
                    {bookingSummary.appointment.additionalInfo && (
                      <p className="text-gray-500 text-sm">{bookingSummary.appointment.additionalInfo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6 flex justify-between items-center">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-2xl">${bookingSummary.totalPrice}</span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4 flex items-start">
                <div className="mr-3 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-teal-600"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-teal-800">Please note</p>
                  <p className="text-teal-700">
                    The final price may differ after the vet visit due to additional services or medicine that may be
                    required. You will be charged after the vet marks the job as finished.
                  </p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">Ready to complete your booking?</h2>
                <p className="text-gray-600">
                  You'll be redirected to our secure payment provider to complete your payment.
                </p>
                <div className="flex justify-center pt-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] px-8 py-6 text-lg"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Processing...
                        </>
                      ) : "Confirm and Pay"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 pt-2">
                  Your payment is processed securely through Stripe. We do not store your card details.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-12">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/book/appointment">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">{error}</div>
        )}
      </main>
    </div>
  )
}
