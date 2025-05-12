"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from "next/navigation"

// Service price map (should match payment/page.tsx)
const servicePriceMap: Record<string, number> = {
  '1': 299, // After hours home visit
  '2': 599, // At-Home Peaceful Euthanasia
};

export default function ConfirmationClient({ user, sessionId }: { user: any, sessionId?: string }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasInserted = useRef(false)
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    async function finalizeAppointment() {
      if (hasInserted.current) return;
      if (sessionId && user) {
        // Check if appointment with this payment_id already exists
        const { data: existing } = await supabase
          .from("appointments")
          .select("id")
          .eq("payment_id", sessionId)
          .maybeSingle();

        if (existing) {
          // Already finalized, skip!
          setIsLoading(false);
          return;
        }

        // Find the draft appointment for this user
        const { data: draft } = await supabase
          .from("appointments")
          .select("*")
          .eq("pet_owner_id", user.id)
          .eq("status", "pending")
          .single();

        if (!draft) {
          setError("No draft appointment found");
          setIsLoading(false);
          return;
        }

        // Finalize the appointment
        const { error } = await supabase
          .from("appointments")
          .update({
            status: "confirmed",
            payment_status: "paid",
            payment_id: sessionId,
            payment_method: "card",
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id);

        if (error) {
          console.error("Error finalizing appointment:", error);
          setError(error.message || 'Unknown error');
          setIsLoading(false);
        } else {
          hasInserted.current = true;
          // Redirect to bookings page after a short delay
          timeoutId = setTimeout(() => {
            router.replace("/portal/bookings");
          }, 500);
        }
      } else {
        if (!sessionId) setError('Missing payment session.');
        if (!user) setError('User not authenticated.');
        setIsLoading(false);
      }
    }

    if (sessionId && user && !hasInserted.current) {
      finalizeAppointment();
    } else if (!sessionId) {
      setIsLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-red-600">{error}</p>
          <Button className="mt-4" onClick={async () => {
            // Cancel (delete) the draft appointment
            if (user) {
              await supabase
                .from('appointments')
                .delete()
                .eq('pet_owner_id', user.id)
                .eq('status', 'pending');
              router.replace('/portal/bookings');
            }
          }}>
            Cancel Booking
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    )
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
        <BookingSteps currentStep="confirmation" />

        <div className="max-w-3xl mx-auto mt-12">
          <div className="bg-white p-8 rounded-lg border shadow-sm">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-teal-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-4">Confirmation</h1>
              <p className="text-gray-600 text-lg max-w-xl mx-auto">
                You have successfully submitted your request with MobiPet. Our team will match a vet with you and will
                get back to you shortly.
              </p>
            </div>

            <div className="bg-teal-50 p-6 rounded-lg border border-teal-100 mb-8">
              <h3 className="font-medium text-teal-800 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-teal-700">
                <li>A confirmation email has been sent to your registered email address.</li>
                <li>Our team will match you with an available vet in your area.</li>
                <li>You'll receive a notification when a vet accepts your appointment.</li>
                <li>The vet may suggest a different time if needed, which you can accept or decline.</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] px-8 py-6 text-lg"
                asChild
              >
                <Link href="/portal/bookings">View appointment status</Link>
              </Button>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/" className="text-teal-600 hover:text-teal-700 font-medium">
              Return to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 