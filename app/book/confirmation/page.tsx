"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter, useSearchParams } from "next/navigation"
import { SmartLogo } from "@/components/smart-logo"
import { supabase } from '@/lib/supabase'

interface ConfirmationData {
  appointmentId: string;
  message: string;
  status?: string;
  petName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  const urlSessionId = searchParams.get('session_id');
  const urlAppointmentId = searchParams.get('appointment_id');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) {
      setError("User not authenticated. Please log in.");
      setIsLoading(false);
      return;
    }

    if (!urlSessionId || !urlAppointmentId) {
      setError("Invalid confirmation link: Session ID or Appointment ID missing.");
      setIsLoading(false);
      return;
    }

    const verifyAndConfirmPayment = async () => {
      setIsLoading(true);
      setError(null);
      setConfirmationData(null);

      try {
        const response = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId: urlSessionId,
            appointmentId: urlAppointmentId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to confirm payment.");
        }
        
        setConfirmationData({
          appointmentId: result.appointmentId,
          message: result.message || "Your booking is confirmed!",
          status: result.newStatus,
          petName: result.petName,
          appointmentDate: result.appointmentDate,
          appointmentTime: result.appointmentTime,
        });

      } catch (e: any) {
        console.error("Payment confirmation error:", e);
        setError(e.message || "An unexpected error occurred during payment confirmation.");
      }
      setIsLoading(false);
    };

    verifyAndConfirmPayment();
  }, [user, urlSessionId, urlAppointmentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-700 text-lg">Verifying your payment and confirming booking...</p>
        <p className="text-gray-500 text-sm">Please do not close or refresh this page.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-red-700 mb-3">Confirmation Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/portal/bookings">View My Bookings</Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (confirmationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b">
          <div className="container mx-auto max-w-[1400px] py-4 px-4">
            <div className="flex items-center">
              <SmartLogo noLink />
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <div className="bg-white p-8 sm:p-12 rounded-lg border shadow-xl text-center">
              <CheckCircle className="h-16 w-16 text-teal-600 mx-auto mb-6" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Booking Confirmed!</h1>
              <p className="text-gray-600 text-lg mb-3">
                {confirmationData.message}
              </p>
              {confirmationData.appointmentId && (
                <p className="text-sm text-gray-500 mb-6">
                  Appointment ID: <span className="font-medium">{confirmationData.appointmentId}</span>
                </p>
              )}
              
              <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mb-8">
                <h3 className="font-semibold text-teal-800 mb-2 text-lg">What happens next?</h3>
                <ul className="space-y-2 text-teal-700 list-disc list-inside">
                  <li>A confirmation email has been sent to your registered email address.</li>
                  <li>Our team will ensure a vet is assigned and prepared for your appointment.</li>
                  <li>You can view your appointment details anytime in your portal.</li>
                </ul>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg rounded-md w-full sm:w-auto"
                  asChild
                >
                  <Link href="/portal/bookings">View My Bookings</Link>
                </Button>
                <Button
                  variant="outline"
                  className="px-8 py-3 text-lg rounded-md w-full sm:w-auto"
                  asChild
                >
                  <Link href="/">Book Another Appointment</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <p className="text-gray-600">Loading confirmation...</p>
    </div>
  );
}