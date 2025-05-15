"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { User } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
import { updateDraft } from "@/lib/draftService"

interface ConfirmationClientProps {
  user: User | null;
  sessionId?: string;
  // appointmentId will be read from URL search params
}

interface ConfirmationData {
  appointmentId: string;
  message: string;
  status?: string; // e.g., 'CONFIRMED', 'PROCESSING'
  petName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export default function ConfirmationClient({ user, sessionId }: ConfirmationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    const urlSessionId = searchParams.get('session_id');
    const urlAppointmentId = searchParams.get('appointment_id');

    if (!user) {
      // This should ideally be handled by the parent server component redirecting to login
      // But as a fallback, if user becomes null client-side:
      setError("User not authenticated. Please log in.");
      setIsLoading(false);
      // router.push('/login'); // Avoid navigation loops if parent already handles this
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
            // userId: user.id, // The API route can verify against appointmentId's user_id
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
            petName: result.petName, // API should return these if needed for display
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
  }, [user, searchParams, router]);

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
            <Link href="/" className="flex justify-center md:justify-start">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
            </Link>
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
              
              {/* Optional: Display more details from confirmationData if needed */}
              {/* {confirmationData.petName && <p>Pet: {confirmationData.petName}</p>} */} 

              <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 my-8 text-left">
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

  // Fallback, should ideally not be reached if logic above is complete
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-600">Loading confirmation...</p>
    </div>
  );
} 