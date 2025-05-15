"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingSteps } from "@/components/booking-steps"
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter, useSearchParams } from "next/navigation"

export default function ClientConfirmation() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const hasProcessed = useRef(false)
  const router = useRouter()
  const supabase = useSupabaseClient()
  const user = useUser()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Only run once per component mount
    if (hasProcessed.current) return;
    
    const processPayment = async () => {
      console.log("Processing payment, sessionId:", sessionId, "user:", user);
      
      if (!sessionId) {
        setError('Missing payment session ID');
        setIsLoading(false);
        setProcessingComplete(true);
        return;
      }
      
      if (!user) {
        // Handle not logged in case
        console.log("No user found, redirecting to login");
        setTimeout(() => {
          router.replace("/login");
        }, 1000);
        return;
      }
      
      try {
        // First check if we already processed this payment
        const { data: existingConfirmed } = await supabase
          .from("appointments")
          .select("id")
          .eq("payment_id", sessionId)
          .eq("status", "confirmed")
          .maybeSingle();
          
        if (existingConfirmed) {
          console.log("Payment already processed:", existingConfirmed);
          setIsSuccess(true);
          setIsLoading(false);
          setProcessingComplete(true);
          return;
        }
        
        // Get all drafts for this user
        const { data: drafts, error: draftsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("pet_owner_id", user.id)
          .eq("status", "pending");
          
        console.log("Draft query result:", { drafts, draftsError });
        
        if (draftsError) {
          console.error("Error fetching drafts:", draftsError);
          setError(draftsError.message || 'Failed to find your appointment');
          setIsLoading(false);
          setProcessingComplete(true);
          return;
        }
        
        if (!drafts || drafts.length === 0) {
          console.log("No drafts found");
          setError('No draft appointment found');
          setIsLoading(false);
          setProcessingComplete(true);
          return;
        }
        
        // Sort by updated_at and get the most recent draft
        const sortedDrafts = [...drafts].sort((a, b) => 
          new Date(b.updated_at || b.created_at).getTime() - 
          new Date(a.updated_at || a.created_at).getTime()
        );
        const draft = sortedDrafts[0];
        
        console.log("Selected draft to update:", draft);
        
        // Update the draft appointment to confirmed
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            status: "confirmed",
            payment_status: "paid",
            payment_id: sessionId,
            payment_method: "card",
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id);
          
        if (updateError) {
          console.error("Error updating appointment:", updateError);
          setError(updateError.message || 'Failed to update your appointment');
          setIsLoading(false);
          setProcessingComplete(true);
          return;
        }
        
        // Successfully updated
        console.log("Appointment successfully confirmed!");
        
        // Optional: Clean up other drafts
        const otherDraftIds = drafts
          .filter(d => d.id !== draft.id)
          .map(d => d.id);
          
        if (otherDraftIds.length > 0) {
          console.log("Cleaning up other drafts:", otherDraftIds);
          await supabase
            .from("appointments")
            .delete()
            .in("id", otherDraftIds);
        }
        
        // Mark as success
        setIsSuccess(true);
        setIsLoading(false);
        setProcessingComplete(true);
        
        // Mark as processed - will not run again even if component re-renders
        hasProcessed.current = true;
        
      } catch (err: any) {
        console.error("Unexpected error in payment processing:", err);
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
        setProcessingComplete(true);
      }
    };
    
    if (sessionId || user) {
      processPayment();
    } else {
      setError('Missing payment information');
      setIsLoading(false);
      setProcessingComplete(true);
    }
    
  }, [sessionId, user, supabase, router]);

  // Show loading spinner while processing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button className="mt-4" onClick={() => router.replace('/portal/bookings')}>
            Cancel Booking
          </Button>
        </div>
      </div>
    );
  }

  // Success page
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
  );
} 