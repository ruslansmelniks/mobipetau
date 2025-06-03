"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Check, AlertCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { loadStripe } from '@stripe/stripe-js'
import { useUser } from "@supabase/auth-helpers-react"
import { useDraftAppointment } from '@/hooks/useDraftAppointment'
import { BookingWarning } from "@/components/booking-warning"

// Consistent DraftAppointment type
type DraftAppointment = {
  id: string;
  pet_owner_id: string;
  pet_id?: string | null;
  service_ids?: string[] | null;
  status: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_in_perth_serviceable_area?: boolean | null;
  additional_info?: string | null;
  notes?: string | null;
  total_price?: number | null;
  created_at: string;
  updated_at?: string | null;
};

// Define Pet and Service types for clarity (adjust fields as per your DB schema)
type Pet = {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  image?: string | null;
  // other pet fields
};

type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
  // other service fields
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ErrorDisplay = ({ error, onRetry }: { error: string, onRetry: () => void }) => {
  const router = useRouter();
  return (
    <div className="bg-white p-8 rounded-lg border shadow-sm text-center max-w-md mx-auto mt-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-red-600 text-2xl">!</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">An Error Occurred</h2>
      <p className="text-gray-600 mb-6">{error || "Failed to fetch draft appointment. Please try again."}</p>
      <div className="flex gap-4 justify-center">
        <Button variant="outline" onClick={() => router.push('/book/appointment')}>
          Back to Appointment Details
        </Button>
        <Button 
          onClick={onRetry} 
          className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
};

const SummaryItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | number | null }) => (
  <div className="flex items-start">
    <span className="mr-2 mt-1 text-teal-600">{icon}</span>
    <div>
      <p className="font-medium text-gray-700">{label}</p>
      {value && <p className="text-gray-600">{value}</p>}
    </div>
  </div>
);

export default function PaymentPage() {
  const router = useRouter();
  const user = useUser();
  const { draftAppointment, isLoading, error: draftError, refetch } = useDraftAppointment();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<any>(null);

  useEffect(() => {
    window.onbeforeunload = null;
    return () => {
      window.onbeforeunload = null;
    };
  }, []);

  useEffect(() => {
    if (!draftAppointment) return;
    if (!draftAppointment.pet_id || !draftAppointment.services || !draftAppointment.date || !draftAppointment.time_slot || !draftAppointment.address) {
      setError('Required booking information is missing. Please review the previous steps.');
      return;
    }
    const draftServices = Array.isArray(draftAppointment.services)
      ? draftAppointment.services
      : typeof draftAppointment.services === 'string'
      ? JSON.parse(draftAppointment.services)
      : [];
    const serviceMap = {
      '1': { id: '1', name: 'After hours home visit', price: 299 },
      '2': { id: '2', name: 'At-Home Peaceful Euthanasia', price: 599 },
    };
    const selectedServicesDetails = draftServices.map(
      (id: string) => serviceMap[id as keyof typeof serviceMap] || { id, name: `Service ${id}`, price: 0 }
    );
    const totalPrice = draftAppointment.total_price || selectedServicesDetails.reduce((sum: number, s: { price: number }) => sum + s.price, 0);
    setBookingSummary({
      services: selectedServicesDetails,
      appointment: {
        date: draftAppointment.date ? new Date(draftAppointment.date).toLocaleDateString() : '',
        time: draftAppointment.time_slot,
        address: draftAppointment.address,
        additionalInfo: draftAppointment.additional_info,
        issueDescription: draftAppointment.notes,
      },
      totalPrice,
    });
  }, [draftAppointment]);

  const handlePayment = async () => {
    if (!bookingSummary) return;
    setIsProcessingPayment(true);
    setError(null);
    try {
      window.onbeforeunload = null;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: draftAppointment?.id,
          amount: bookingSummary.totalPrice,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to process payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Please log in to continue booking</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || draftError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600">{error || String(draftError)}</p>
          <Button
            className="mt-4"
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!bookingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-gray-600">No booking information found. Please start over.</p>
          <Button
            className="mt-4"
            onClick={() => router.push('/book')}
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <Link href="/" className="flex justify-center md:justify-start">
            <Image 
              src="/logo.png" 
              alt="MobiPet Logo" 
              width={96} 
              height={32} 
              className="h-[32px] w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="payment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Review and pay</h1>
          <p className="text-center text-gray-600 mb-8">Please review your booking details before proceeding to payment.</p>

          <div className="space-y-6">
            {/* Services Section */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold mb-4">Selected Services</h2>
              <div className="space-y-4">
                {bookingSummary.services.map((service: any) => (
                  <div key={service.id} className="flex justify-between items-center">
                    <span>{service.name}</span>
                    <span className="font-medium">${service.price}</span>
                  </div>
                ))}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span>${bookingSummary.totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details Section */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold mb-4">Appointment Details</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2">{bookingSummary.appointment.date}</span>
                </div>
                <div>
                  <span className="text-gray-600">Time:</span>
                  <span className="ml-2">{bookingSummary.appointment.time}</span>
                </div>
                <div>
                  <span className="text-gray-600">Address:</span>
                  <span className="ml-2">{bookingSummary.appointment.address}</span>
                </div>
                {bookingSummary.appointment.additionalInfo && (
                  <div>
                    <span className="text-gray-600">Additional Information:</span>
                    <span className="ml-2">{bookingSummary.appointment.additionalInfo}</span>
                  </div>
                )}
                {bookingSummary.appointment.issueDescription && (
                  <div>
                    <span className="text-gray-600">Issue Description:</span>
                    <span className="ml-2">{bookingSummary.appointment.issueDescription}</span>
                  </div>
                )}
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
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {isProcessingPayment ? (
                <>
                  <span className="mr-2">Processing...</span>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </div>
      </main>

      <BookingWarning />
    </div>
  );
}
