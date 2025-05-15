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
    const fetchBookingDetails = async () => {
      if (!user) {
        // Wait for user or redirect if session is definitively not there
        const sessionCheck = await supabase.auth.getSession();
        if (!sessionCheck.data.session?.user) {
            setError("No active session. Please log in.");
            setIsLoading(false);
            router.push("/login");
            return;
        }
        // if user becomes available, effect re-runs
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch the latest draft appointment
        const { data: draft, error: draftError } = await supabase
          .from('appointments')
          .select('*')
          .eq('pet_owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draftError) throw new Error(`Failed to load booking: ${draftError.message}`);
        if (!draft) {
          setError("No booking in progress. Please start from the beginning.");
          setIsLoading(false);
          router.push('/book');
          return;
        }

        // Validate if previous steps are completed
        if (!draft.pet_id || !draft.service_ids || draft.service_ids.length === 0 || 
            !draft.appointment_date || !draft.appointment_time || !draft.address || 
            draft.is_in_perth_serviceable_area === false) {
          setError("Booking details incomplete. Please review previous steps.");
          setIsLoading(false);
          router.push('/book/appointment'); // Or a more appropriate previous step
          return;
        }
        setDraftAppointment(draft as DraftAppointment);

        // 2. Fetch Pet Details
        if (draft.pet_id) {
          const { data: petData, error: petError } = await supabase
            .from('pets')
            .select('*')
            .eq('id', draft.pet_id)
            .single();
          if (petError) throw new Error(`Failed to load pet details: ${petError.message}`);
          setPetDetails(petData as Pet);
        }

        // 3. Fetch Service Details
        if (draft.service_ids && draft.service_ids.length > 0) {
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('*')
            .in('id', draft.service_ids);
          if (servicesError) throw new Error(`Failed to load service details: ${servicesError.message}`);
          setSelectedServicesDetails(servicesData as Service[] || []);
        }

      } catch (e: any) {
        console.error("Error fetching booking details:", e);
        setError(e.message || "An unexpected error occurred while loading your booking.");
      }
      setIsLoading(false);
    };

    fetchBookingDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, supabase]);

  const handlePayment = async () => {
    if (!draftAppointment || !draftAppointment.total_price) {
      setError("Cannot proceed to payment: Booking details or total price are missing.");
      return;
    }
    setIsProcessingPayment(true);
    setError(null);

    try {
      // Optional: Update draft status to 'processing_payment' or similar
      const { error: statusUpdateError } = await supabase
        .from('appointments')
        .update({ status: 'processing_payment', updated_at: new Date().toISOString() })
        .eq('id', draftAppointment.id);

      if (statusUpdateError) {
        console.error("Error updating appointment status:", statusUpdateError);
        // Decide if this is a critical failure or if we can proceed to payment attempt anyway
        // For now, log and proceed.
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: draftAppointment.id,
          amount: draftAppointment.total_price, // Ensure this is in cents if Stripe expects cents
          userId: user?.id, // Pass user ID for Stripe customer management
          // Add any other necessary details like pet name, services for description on Stripe page
          description: `MobiPet Booking for ${petDetails?.name || 'your pet'}`,
          customer_email: user?.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session.");
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      if (stripe && sessionId) {
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
        if (stripeError) {
          throw new Error(stripeError.message || "Failed to redirect to Stripe.");
        }
      } else {
        throw new Error ("Stripe.js or session ID not available.");
      }
    } catch (e: any) {
      console.error("Payment handling error:", e);
      setError(`Payment error: ${e.message}. Please try again or contact support.`);
      // Optional: Revert status if it was updated
      // await supabase.from('appointments').update({ status: 'pending_confirmation' }).eq('id', draftAppointment.id);
    }
    setIsProcessingPayment(false);
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
