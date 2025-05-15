"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { getOrCreateDraft, updateDraft } from "@/lib/draftService"
import { BookingWarning } from "@/components/booking-warning"

// Define types consistent with app/book/page.tsx
type DraftAppointment = {
  id: string;
  pet_owner_id: string;
  pet_id?: string | null;
  service_ids?: string[] | null;
  services?: string[] | null;
  status: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  address?: string | null;
  additional_info?: string | null;
  notes?: string | null; // For issue description
  total_price?: number | null;
  created_at: string;
  updated_at?: string | null;
};

type Service = {
  id: string;
  name: string; // Changed from title for consistency if DB schema uses 'name'
  description: string;
  price: number;
  // Add other relevant fields if any, e.g., duration, category
};

// Hard-coded services array
const services = [
  {
    id: "1",
    name: "After hours home visit",
    description: "A qualified vet will be prioritised to come to urgently assist your pet...",
    price: 299,
  },
  {
    id: "2",
    name: "At-Home Peaceful Euthanasia",
    description: "A compassionate, gentle farewell for your pet in the comfort...",
    price: 599,
  },
];

export default function SelectServices() {
  const [draftAppointment, setDraftAppointment] = useState<DraftAppointment | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [issueDescription, setIssueDescription] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // For Next button loading state
  
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const calculateTotal = useCallback(() => {
    if (!allServices.length || !selectedServiceIds.length) return 0;
    return allServices
      .filter((service) => selectedServiceIds.includes(service.id))
      .reduce((total, service) => total + service.price, 0);
  }, [allServices, selectedServiceIds]);

  const debug = true;

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          setError("No active session. Please log in.");
          setIsLoading(false);
          router.push("/login");
          return;
        }
      }
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User session not found. Please log in again.");
          setIsLoading(false);
          router.push("/login");
          return;
        }
        // Use new draft service
        const draft = await getOrCreateDraft(supabase, user.id);
        if (!draft || !draft.pet_id) {
          setError("No booking in progress or pet not selected. Please start again.");
          setIsLoading(false);
          router.push('/book');
          return;
        }
        setDraftAppointment(draft);
        const draftServices = Array.isArray(draft.services) ? draft.services : (typeof draft.services === 'string' ? JSON.parse(draft.services) : []);
        setSelectedServiceIds(draftServices);
        setIssueDescription(draft.notes || "");
        setAllServices(services);
      } catch (e: any) {
        setError(`An unexpected error occurred: ${e.message}`);
      }
      setIsLoading(false);
    };
    if (user) {
      fetchInitialData();
    } else {
      const checkSessionAndFetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          fetchInitialData();
        } else if (!isLoading) {
            setError("Authenticating... please wait or try logging in.");
        }
      };
      checkSessionAndFetch();
    }
  }, [user, router, supabase]);

  const updateDraftInSupabase = async (updatedFields: Partial<DraftAppointment>) => {
    if (!draftAppointment) {
      setError("Cannot save: No booking in progress.");
      return null;
    }
    setIsSaving(true);
    setError(null);
    try {
      const newDraft = await updateDraft(supabase, draftAppointment.id, updatedFields);
      setDraftAppointment(newDraft);
      setIsSaving(false);
      return newDraft;
    } catch (updateError: any) {
      setIsSaving(false);
      setError(`Failed to save changes: ${updateError.message}. Please try again.`);
      return null;
    }
  };

  const handleServiceToggle = async (serviceId: string) => {
    const newSelectedServiceIds = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    setSelectedServiceIds(newSelectedServiceIds);
    await updateDraftInSupabase({
      services: newSelectedServiceIds, // Save to 'services' field
      total_price: calculateTotal(),
    });
  };

  const handleNext = async () => {
    if (selectedServiceIds.length === 0 || !draftAppointment) return;
    setError(null);
    try {
      setIsLoading(true);
      await updateDraft(supabase, draftAppointment.id, {
        services: selectedServiceIds,
        notes: issueDescription,
        total_price: calculateTotal(),
      });
      router.push("/book/appointment");
    } catch (err: any) {
      setError('Error updating services. Please try again.');
      console.error(err);
    }
    setIsLoading(false);
  };
  
  // Simplified handleCancelBooking - assuming it might be removed if not part of this page's primary UX
  // Or would need to be adapted like in app/book/page.tsx

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading services...</p> {/* Replace with a proper spinner/skeleton */}
      </div>
    );
  }

  if (error && !isSaving) { // Don't show general error if a save operation is in progress and might set its own error
    return (
      <div className="container mx-auto max-w-md mt-8 text-center p-4">
        <h2 className="text-xl font-semibold text-red-600 mb-2">An Error Occurred</h2>
        <p className="mb-4">{error}</p>
        <Button variant="default" onClick={() => router.push('/book')} className="mr-2">
          Start Over
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  if (!draftAppointment && !isLoading) { // Should be caught by redirect earlier, but as a fallback
     return (
      <div className="container mx-auto max-w-md mt-8 text-center p-4">
        <h2 className="text-xl font-semibold text-yellow-600 mb-2">No active booking</h2>
        <p className="mb-4">We couldn't find your current booking. Please start over.</p>
        <Button variant="default" onClick={() => router.push('/book')}>
          Back to Pet Selection
        </Button>
      </div>
    );
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
        <BookingSteps currentStep="services" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Select services</h1>
          <p className="text-center text-gray-600 mb-8">
            A qualified vet will come to assist your pet in a relaxed and familiar environment.
          </p>
          
          {/* Display specific saving error if any */}
          {error && isSaving && (
             <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Failed to save: {error}</div>
          )}

          {allServices.length === 0 && !isLoading && (
            <p className="text-center text-gray-500">No services available at the moment. Please check back later.</p>
          )}

          <div className="space-y-4 mb-8">
            {allServices.map((service) => (
              <div
                key={service.id}
                className={`border rounded-lg p-6 bg-white hover:border-teal-200 transition-colors cursor-pointer ${
                  selectedServiceIds.includes(service.id) ? "border-teal-500 ring-1 ring-teal-500" : ""
                }`}
                onClick={() => handleServiceToggle(service.id)}
              >
                <div className="flex items-start">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)} // Already handled by div click, but good for accessibility
                    className="mr-4 mt-1"
                    onClick={(e) => e.stopPropagation()} // Prevent double toggle if div also handles click
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg">{service.name}</h3>
                      <span className="font-semibold text-lg">${service.price}</span>
                    </div>
                    <p className="text-gray-600 mt-2">{service.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg border mb-8">
            <Label htmlFor="issue-description" className="text-base font-medium mb-2 block">
              Describe your pet's issue (optional)
            </Label>
            <Textarea
              id="issue-description"
              placeholder="Please provide details about your pet's condition, symptoms, or any specific concerns you have. This will help the vet prepare for the visit."
              className="min-h-[120px] resize-y"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              // Consider adding onBlur or a separate save button for this if debouncing is too complex for now
            />
            <p className="text-sm text-gray-500 mt-2">
              The more information you provide, the better prepared our vet will be to help your pet.
            </p>
          </div>

          {selectedServiceIds.length > 0 && (
            <div className="bg-white p-4 rounded-lg border mb-8">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-semibold text-lg">${calculateTotal()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-12">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/book"> {/* Should ideally go to previous step based on draft id if available */}
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedServiceIds.length === 0 || isSaving || isLoading}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Processing...</span>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
          
          {/* General error display, if not related to saving and not in loading state */}
          {error && !isSaving && !isLoading && (
             <div className="bg-red-100 text-red-700 p-4 rounded mt-4 text-center">{error}</div>
          )}

          <BookingWarning />

        </div>
      </main>
    </div>
  )
}
