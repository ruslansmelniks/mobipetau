"use client"

import { useState, useEffect, ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Check, AlertCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { loadStripe } from '@stripe/stripe-js'
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { format, parseISO } from 'date-fns'

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

export default function PaymentPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [draftAppointment, setDraftAppointment] = useState<DraftAppointment | null>(null);
  const [petDetails, setPetDetails] = useState<Pet | null>(null);
  const [selectedServicesDetails, setSelectedServicesDetails] = useState<Service[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const fetchDraftAppointment = async () => {
      if (!user) return;
      try {
        console.log("Fetching draft appointment for payment review");
        const { data: draft, error: fetchError } = await supabase
          .from('appointments')
          .select(`*, pets (*), services`)
          .eq('pet_owner_id', user.id)
          .eq('status', 'pending')
          .single();
        if (fetchError) {
          console.error("Failed to fetch draft appointment:", fetchError);
          setError('Failed to fetch draft appointment. Please try again.');
          setIsLoading(false);
          return;
        }
        if (!draft) {
          console.error("No draft appointment found");
          setError('No draft appointment found. Redirecting...');
          setTimeout(() => {
            router.replace('/book');
          }, 2000);
          setIsLoading(false);
          return;
        }
        setDraftAppointment(draft);
        // Fetch and set pet/service details as needed here
        // ...
        setIsLoading(false);
      } catch (e) {
        console.error("Error fetching draft appointment:", e);
        setError('An unexpected error occurred while loading your booking.');
        setIsLoading(false);
      }
    };
    fetchDraftAppointment();
  }, [user]);

  const handlePayment = async () => {
    if (!draftAppointment || !draftAppointment.total_price) {
      setError("Cannot process payment: missing draft ID or booking summary");
      return;
    }
    setIsProcessingPayment(true);
    setError(null);
    try {
      console.log("Creating checkout session for appointment:", draftAppointment.id);
      console.log("Amount:", draftAppointment.total_price);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: draftAppointment.id,
          amount: draftAppointment.total_price,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to create checkout session:", errorData);
        setError('Failed to create checkout session. Please try again.');
        setIsProcessingPayment(false);
        return;
      }
      const { sessionId } = await response.json();
      console.log("Got session ID:", sessionId);
      const stripe = await stripePromise;
      if (!stripe) {
        console.error("Stripe failed to initialize");
        setError('Payment system unavailable. Please try again later.');
        setIsProcessingPayment(false);
        return;
      }
      console.log("Redirecting to Stripe checkout...");
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Error creating checkout session. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const SummaryItem = ({ icon, label, value }: { icon: ReactNode, label: string, value?: string | number | null }) => (
    <div className="flex items-start">
      <span className="mr-2 mt-1 text-teal-600">{icon}</span>
      <div>
        <p className="font-medium text-gray-700">{label}</p>
        {value && <p className="text-gray-600">{value}</p>}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading booking summary...</p>
      </div>
    );
  }

  if (error && !isProcessingPayment) {
    return (
      <div className="container mx-auto max-w-lg mt-12 p-6 bg-white shadow-lg rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-3">An Error Occurred</h2>
        <p className="mb-6 text-gray-700">{error}</p>
        <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={() => router.push('/book/appointment')} className="mr-2">
                Back to Appointment Details
            </Button>
            <Button variant="default" onClick={() => window.location.reload()}>
                Try Again
            </Button>
        </div>
      </div>
    );
  }
  
  if (!draftAppointment || !petDetails || selectedServicesDetails.length === 0) {
     // This case should ideally be caught by the validation in useEffect and redirect
     // but serves as a fallback if data is missing post-loading.
     return (
      <div className="container mx-auto max-w-lg mt-12 p-6 bg-white shadow-lg rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-yellow-700 mb-3">Booking Incomplete</h2>
        <p className="mb-6 text-gray-700">Required booking information is missing. Please review the previous steps.</p>
        <Button variant="default" onClick={() => router.push('/book')}>
          Start Over
        </Button>
      </div>
    );
  }
  
  const formattedDate = draftAppointment.appointment_date 
    ? format(parseISO(draftAppointment.appointment_date), "EEEE, MMMM do, yyyy") 
    : "Not set";

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
          <h1 className="text-3xl font-bold text-center mb-2">Confirm & Pay</h1>
          <p className="text-center text-gray-600 mb-8">Review your appointment details and complete your booking.</p>

          {error && isProcessingPayment && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
                <strong className="font-bold">Payment Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="bg-white p-6 sm:p-8 rounded-lg border shadow-md">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">Booking Summary</h2>
            
            <div className="flex items-center gap-4 pb-6 mb-6 border-b">
              {petDetails.image ? (
                <Image
                  src={petDetails.image}
                  alt={petDetails.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm flex-shrink-0">
                  No Img
                </div>
              )}
              <div>
                <h3 className="font-semibold text-xl text-gray-700">{petDetails.name}</h3>
                {petDetails.species && <p className="text-gray-500">{petDetails.species}{petDetails.breed ? ` (${petDetails.breed})` : ''}</p>}
              </div>
            </div>

            <div className="space-y-4 mb-6 pb-6 border-b">
                <h4 className="font-medium text-lg text-gray-700 mb-2 flex items-center">
                    <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" /> Selected Services
                </h4>
                {selectedServicesDetails.map(service => (
                    <div key={service.id} className="flex justify-between items-center ml-7">
                        <span className="text-gray-600">{service.name}</span>
                        <span className="font-medium text-gray-700">${service.price.toFixed(2)}</span>
                    </div>
                ))}
                {draftAppointment.notes && (
                    <div className="ml-7 pt-2">
                        <p className="text-sm font-medium text-gray-600">Issue Description:</p>
                        <p className="text-sm text-gray-500 whitespace-pre-wrap">{draftAppointment.notes}</p>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                <SummaryItem icon={<Calendar size={20}/>} label="Date" value={formattedDate} />
                <SummaryItem icon={<Clock size={20}/>} label="Time" value={draftAppointment.appointment_time} />
                <div className="md:col-span-2">
                    <SummaryItem icon={<MapPin size={20}/>} label="Address" value={draftAppointment.address} />
                </div>
                {draftAppointment.additional_info && (
                    <div className="md:col-span-2">
                         <SummaryItem icon={<Check size={20}/>} label="Additional Instructions" value={draftAppointment.additional_info} />
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center py-4">
              <span className="text-xl font-semibold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-teal-600">
                ${(draftAppointment.total_price || 0).toFixed(2)}
              </span>
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
              disabled={isProcessingPayment || isLoading || !draftAppointment || !!error} // Disable if error exists too
              className="bg-teal-600 hover:bg-teal-700 text-white text-lg px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out flex items-center gap-2"
            >
              {isProcessingPayment ? (
                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...</>
              ) : (
                <><CreditCard className="h-5 w-5 mr-2" /> Proceed to Secure Payment</>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
