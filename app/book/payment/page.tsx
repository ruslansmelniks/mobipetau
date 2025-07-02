"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Check, AlertCircle, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '@/lib/supabase'
import { SmartLogo } from "@/components/smart-logo"

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
  const [user, setUser] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const createAppointmentAndLoadSummary = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load all booking data from sessionStorage
        const pet_id = sessionStorage.getItem('booking_pet_id');
        const service_ids = JSON.parse(sessionStorage.getItem('booking_service_ids') || '[]');
        const issueDescription = sessionStorage.getItem('booking_issue_description') || '';
        const address = sessionStorage.getItem('booking_address') || '';
        const date = sessionStorage.getItem('booking_date') || '';
        const time_slot = sessionStorage.getItem('booking_time_slot') || '';
        const additional_info = sessionStorage.getItem('booking_additional_info') || '';
        const is_in_perth = sessionStorage.getItem('booking_is_in_perth') === 'true';
        const latitude = sessionStorage.getItem('booking_latitude');
        const longitude = sessionStorage.getItem('booking_longitude');

        if (!pet_id || !service_ids.length || !date || !time_slot || !address) {
          setError('Required booking information is missing. Please review the previous steps.');
          setLoading(false);
          return;
        }

        // Service pricing map
        const serviceMap: Record<string, { id: string; name: string; price: number }> = {
          '1': { id: '1', name: 'After hours home visit', price: 299 },
          '2': { id: '2', name: 'At-Home Peaceful Euthanasia', price: 599 },
        };

        // Calculate selected services and total
        const selectedServices = service_ids.map((id: string) => 
          serviceMap[id] || { id, name: `Service ${id}`, price: 0 }
        );
        const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);

        // Create or update appointment
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            pet_owner_id: user.id,
            pet_id: pet_id,
            services: selectedServices,
            status: 'pending',
            date: date,
            time_slot: time_slot,
            address: address,
            additional_info: additional_info,
            notes: issueDescription,
            total_price: totalPrice,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (appointmentError) {
          console.error('Error creating appointment:', appointmentError);
          setError('Failed to create appointment. Please try again.');
          setLoading(false);
          return;
        }

        setAppointmentId(appointment.id);

        // Get pet details
        const { data: petData } = await supabase
          .from('pets')
          .select('name, type')
          .eq('id', pet_id)
          .single();

        setBookingSummary({
          id: appointment.id,
          pet: petData,
          services: selectedServices,
          appointment: {
            date: new Date(date).toLocaleDateString(),
            time: time_slot,
            address: address,
            additionalInfo: additional_info,
            issueDescription: issueDescription,
          },
          totalPrice: totalPrice,
        });

      } catch (err: any) {
        console.error('Error loading booking summary:', err);
        setError(err.message || 'Failed to load booking details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    createAppointmentAndLoadSummary();
  }, [user, supabase]);

  const handlePayment = async () => {
    if (!bookingSummary || !appointmentId) return;
    
    setIsProcessingPayment(true);
    setError(null);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          amount: bookingSummary.totalPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Clear session storage before redirecting
      sessionStorage.clear();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err: any) {
      console.error('Payment error:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        <p className="mt-4 text-gray-600">Loading booking details...</p>
      </div>
    );
  }

  if (error && !bookingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
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
          <div className="flex items-center">
            <SmartLogo noLink />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="payment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Review and pay</h1>
          <p className="text-center text-gray-600 mb-8">Please review your booking details before proceeding to payment.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Pet Information */}
            {bookingSummary.pet && (
              <div className="bg-white p-6 rounded-lg border">
                <h2 className="text-lg font-semibold mb-4">Pet Information</h2>
                <p>{bookingSummary.pet.name} - {bookingSummary.pet.type}</p>
              </div>
            )}

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
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{bookingSummary.appointment.date}</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium">{bookingSummary.appointment.time}</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 font-medium">{bookingSummary.appointment.address}</span>
                  </div>
                </div>
                {bookingSummary.appointment.additionalInfo && (
                  <div>
                    <span className="text-gray-600">Additional Information:</span>
                    <p className="mt-1 text-gray-700">{bookingSummary.appointment.additionalInfo}</p>
                  </div>
                )}
                {bookingSummary.appointment.issueDescription && (
                  <div>
                    <span className="text-gray-600">Issue Description:</span>
                    <p className="mt-1 text-gray-700">{bookingSummary.appointment.issueDescription}</p>
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
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
