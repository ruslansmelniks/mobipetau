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
import { getOrCreateDraft, updateDraft } from "@/lib/draftService"
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

const debugDatabase = async (supabase: any, user: any) => {
  if (!user) return;
  console.log("User ID being used in query:", user.id);
  // Check table structure
  console.log("Examining appointments table structure...");
  const { data: tableStructure, error: tableError } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);
  console.log("Table structure:", tableStructure, "Error (if any):", tableError);
  // Check for draft appointments
  const { data: draftData, error: draftError } = await supabase
    .from('appointments')
    .select('*')
    .eq('pet_owner_id', user.id)
    .eq('status', 'pending');
  console.log("Draft appointment query result:", { error: draftError, data: draftData, count: draftData?.length, status: 200, statusText: '' });
  if (draftData && draftData.length > 0) {
    console.log("Draft fetch result:", draftData[0]);
    console.log("Fetched/Created Appointment Record (structure debug):", JSON.stringify(draftData[0], null, 2));
  } else {
    console.log("No draft appointment found");
  }
};

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
  const [hasMounted, setHasMounted] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<any>(null);
  const [missingDraft, setMissingDraft] = useState(false);
  const [missingData, setMissingData] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setMissingData(false);
    const fetchDraftAppointment = async () => {
      try {
        // Only fetch, do NOT create a new draft on payment page
        const { data: drafts, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('pet_owner_id', user.id)
          .eq('status', 'pending')
          .order('updated_at', { ascending: false });
        if (fetchError) {
          setError('Failed to fetch draft appointment. Please try again.');
          setIsLoading(false);
          return;
        }
        if (!drafts || drafts.length === 0) {
          setError('No draft appointment found. Please start your booking again.');
          setIsLoading(false);
          return;
        }
        // Use the most recent draft
        const draft = drafts[0];
        setDraftId(draft.id);
        // Validate all required fields are present
        if (!draft.pet_id || !draft.services || !draft.date || !draft.time_slot || !draft.address) {
          setMissingData(true);
          setIsLoading(false);
          return;
        }
        // Get pet details
        const { data: pet, error: petError } = await supabase
          .from('pets')
          .select('*')
          .eq('id', draft.pet_id)
          .single();
        if (petError) {
          setError('Failed to load pet details. Please try again.');
          setIsLoading(false);
          return;
        }
        // Format services
        const draftServices = Array.isArray(draft.services) ? draft.services : (typeof draft.services === 'string' ? JSON.parse(draft.services) : []);
        const serviceMap = {
          '1': { id: '1', name: "After hours home visit", price: 299 },
          '2': { id: '2', name: "At-Home Peaceful Euthanasia", price: 599 },
        };
        const selectedServicesDetails = draftServices.map((id: string) => serviceMap[id as keyof typeof serviceMap] || { id, name: `Service ${id}`, price: 0 });
        const totalPrice = draft.total_price || selectedServicesDetails.reduce((sum: number, s: { price: number }) => sum + s.price, 0);
        setPetDetails(pet);
        setSelectedServicesDetails(selectedServicesDetails);
        setBookingSummary({
          pet,
          services: selectedServicesDetails,
          appointment: {
            date: draft.date ? new Date(draft.date).toLocaleDateString() : '',
            time: draft.time_slot,
            address: draft.address,
            additionalInfo: draft.additional_info,
            issueDescription: draft.notes,
          },
          totalPrice,
        });
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load booking details. Please try again.');
        setIsLoading(false);
      }
    };
    fetchDraftAppointment();
  }, [user, hasMounted]);

  const handlePayment = async () => {
    if (!draftId || !bookingSummary) {
      console.error("Cannot proceed with payment: missing draft ID or booking summary");
      setError("Unable to process your booking. Please try again.");
      return;
    }
    setIsProcessingPayment(true);
    setError(null);
    try {
      console.log("Creating checkout session for appointment:", draftId);
      const paymentDetails = {
        appointmentId: draftId,
        amount: bookingSummary.totalPrice,
        petName: bookingSummary.pet?.name || "Unknown Pet",
        serviceNames: bookingSummary.services.map((s: any) => s.name).join(", "),
        appointmentDate: bookingSummary.appointment.date,
      };
      console.log("Payment details:", paymentDetails);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentDetails),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error creating checkout session:", {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        setError(`Failed to create checkout session (${response.status}). Please try again.`);
        setIsProcessingPayment(false);
        return;
      }
      const { sessionId } = await response.json();
      console.log("Got Stripe session ID:", sessionId);
      const stripe = await stripePromise;
      if (!stripe) {
        console.error("Stripe failed to initialize");
        setError('Payment system unavailable. Please try again later.');
        setIsProcessingPayment(false);
        return;
      }
      console.log("Redirecting to Stripe checkout...");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        console.error("Stripe redirect error:", error);
        setError(`Payment error: ${error.message}`);
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error('Error in payment process:', error);
      setError('Error processing payment. Please try again.');
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
    return <div className="flex justify-center items-center h-screen">Loading booking details...</div>;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  if (missingData) {
    return (
      <div className="max-w-3xl mx-auto mt-12 bg-white p-8 rounded-lg border text-center">
        <div className="mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-yellow-600 text-2xl">!</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-4">Booking Incomplete</h2>
        <p className="mb-6">Required booking information is missing. Please review the previous steps.</p>
        <Button 
          asChild 
          className="bg-[#4e968f] hover:bg-[#43847e]"
          onClick={() => router.push('/book')}
        >
          <Link href="/book">Start Over</Link>
        </Button>
      </div>
    );
  }

  if (!bookingSummary) {
    return <div className="flex justify-center items-center h-screen">Loading booking summary...</div>;
  }

  const formattedDate = bookingSummary?.appointment?.date || "Not set";

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

          <div className="bg-white p-6 sm:p-8 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">Booking Summary</h2>
            <div className="flex items-center gap-4 pb-6 mb-6 border-b">
              {petDetails && petDetails.image ? (
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
                <h3 className="font-semibold text-xl text-gray-700">{petDetails?.name}</h3>
                {petDetails?.species && <p className="text-gray-500">{petDetails.species}{petDetails.breed ? ` (${petDetails.breed})` : ''}</p>}
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
              {bookingSummary?.notes && (
                <div className="ml-7 pt-2">
                  <p className="text-sm font-medium text-gray-600">Issue Description:</p>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">{bookingSummary.notes}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
              <div className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600"><Calendar size={20}/></span>
                <div>
                  <p className="font-medium text-gray-700">Date</p>
                  <p className="text-gray-600">{bookingSummary?.appointment?.date || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="mr-2 mt-1 text-teal-600"><Clock size={20}/></span>
                <div>
                  <p className="font-medium text-gray-700">Time</p>
                  <p className="text-gray-600">{bookingSummary?.appointment?.time}</p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-start">
                <span className="mr-2 mt-1 text-teal-600"><MapPin size={20}/></span>
                <div>
                  <p className="font-medium text-gray-700">Address</p>
                  <p className="text-gray-600">{bookingSummary?.appointment?.address}</p>
                  {bookingSummary?.appointment?.additionalInfo && (
                    <p className="text-gray-500 text-sm mt-1">{bookingSummary.appointment.additionalInfo}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-4">
              <span className="text-xl font-semibold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-teal-600">
                ${(bookingSummary?.totalPrice || 0).toFixed(2)}
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
              disabled={isProcessingPayment || isLoading || !bookingSummary || !!error}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] text-white px-8 py-3 rounded-lg transition duration-150 ease-in-out flex items-center gap-2 text-base"
            >
              {isProcessingPayment ? (
                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...</>
              ) : (
                <><CreditCard className="h-5 w-5 mr-2" /> Proceed to Secure Payment</>
              )}
            </Button>
          </div>
        </div>

        <BookingWarning />
      </main>
    </div>
  )
}
