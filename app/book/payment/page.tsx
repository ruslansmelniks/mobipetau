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
import { useAppointments } from "@/hooks/useAppointments"
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
  const { useDraftAppointment } = useAppointments();
  const { data: draftAppointment, isLoading: isLoadingDraft, error: draftError } = useDraftAppointment(user?.id ?? '');

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<any>(null);

  useEffect(() => {
    if (!draftAppointment) return;

    // Validate all required fields are present
    if (!draftAppointment.pet_id || !draftAppointment.services || !draftAppointment.date || !draftAppointment.time_slot || !draftAppointment.address) {
      setError('Required booking information is missing. Please review the previous steps.');
      return;
    }

    // Format services
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
    if (!draftAppointment?.id || !bookingSummary) {
      console.error('Cannot proceed with payment: missing draft ID or booking summary');
      setError('Unable to process your booking. Please try again.');
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      console.log('Creating checkout session for appointment:', draftAppointment.id);
      const paymentDetails = {
        appointmentId: draftAppointment.id,
        amount: bookingSummary.totalPrice,
        petName: bookingSummary.pet?.name || 'Unknown Pet',
        serviceNames: bookingSummary.services.map((s: any) => s.name).join(', '),
        appointmentDate: bookingSummary.appointment.date,
      };

      console.log('Payment details:', paymentDetails);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentDetails),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating checkout session:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        setError(`Failed to create checkout session (${response.status}). Please try again.`);
        setIsProcessingPayment(false);
        return;
      }

      const { sessionId } = await response.json();
      console.log('Got Stripe session ID:', sessionId);
      const stripe = await stripePromise;

      if (!stripe) {
        console.error('Stripe failed to initialize');
        setError('Payment system unavailable. Please try again later.');
        setIsProcessingPayment(false);
        return;
      }

      console.log('Redirecting to Stripe checkout...');
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe redirect error:', error);
        setError(`Payment error: ${error.message}`);
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error('Error in payment process:', error);
      setError('Error processing payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || draftError) {
    return <ErrorDisplay error={error || draftError?.message || 'An error occurred'} onRetry={() => window.location.reload()} />;
  }

  if (!bookingSummary) {
    return (
      <div className="max-w-3xl mx-auto mt-12 bg-white p-8 rounded-lg border text-center">
        <div className="mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-yellow-600 text-2xl">!</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-4">Booking Incomplete</h2>
        <p className="mb-6">Required booking information is missing. Please review the previous steps.</p>
        <Button asChild className="bg-[#4e968f] hover:bg-[#43847e]" onClick={() => router.push('/book')}>
          <Link href="/book">Start Over</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <Link href="/" className="flex justify-center md:justify-start">
            <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="payment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Confirm & Pay</h1>
          <p className="text-center text-gray-600 mb-8">Review your appointment details and complete your booking.</p>

          <div className="bg-white rounded-lg border p-6 mb-8">
            <div className="space-y-4 mb-6 pb-6 border-b">
              <h4 className="font-medium text-lg text-gray-700 mb-2 flex items-center">
                <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" /> Selected Services
              </h4>
              {bookingSummary.services.map((service: any) => (
                <div key={service.id} className="flex justify-between items-center ml-7">
                  <span className="text-gray-600">{service.name}</span>
                  <span className="font-medium text-gray-700">${service.price.toFixed(2)}</span>
                </div>
              ))}
              {bookingSummary.appointment.issueDescription && (
                <div className="ml-7 pt-2">
                  <p className="text-sm font-medium text-gray-600">Issue Description:</p>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">{bookingSummary.appointment.issueDescription}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
              <SummaryItem icon={<Calendar size={20} />} label="Date" value={bookingSummary.appointment.date} />
              <SummaryItem icon={<Clock size={20} />} label="Time" value={bookingSummary.appointment.time} />
              <div className="md:col-span-2">
                <SummaryItem icon={<MapPin size={20} />} label="Address" value={bookingSummary.appointment.address} />
                {bookingSummary.appointment.additionalInfo && (
                  <p className="text-gray-500 text-sm mt-1 ml-7">{bookingSummary.appointment.additionalInfo}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center py-4">
              <span className="text-xl font-semibold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-teal-600">${(bookingSummary.totalPrice || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between mt-10">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/book/appointment">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment || isLoadingDraft || !bookingSummary || !!error}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] text-white px-8 py-3 rounded-lg transition duration-150 ease-in-out flex items-center gap-2 text-base"
            >
              {isProcessingPayment ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" /> Proceed to Secure Payment
                </>
              )}
            </Button>
          </div>
        </div>

        <BookingWarning />
      </main>
    </div>
  )
}
