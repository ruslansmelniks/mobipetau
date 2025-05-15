"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'

// Define a simple appointment type as per user request
type DraftAppointment = {
  id: string;
  pet_owner_id: string;
  pet_id?: string | null; // Allow null for pet_id
  service_ids?: string[]; 
  status: string;
  appointment_date?: string; 
  appointment_time?: string; 
  address?: string;
  additional_info?: string;
  notes?: string;
  created_at: string;
  updated_at?: string | null; // Allow null for updated_at
};

export default function BookAppointment() {
  const authUser = useUser(); 
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [draftAppointment, setDraftAppointment] = useState<DraftAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const debug = true;

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      setPets([]); // Reset pets before fetching
      setSelectedPet(null); // Reset selected pet

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('No active session. Please log in.');
        setIsLoading(false);
        router.push('/login');
        return;
      }

      const { user: currentSessionUser } = session; 
      if (!currentSessionUser) {
        setError('User not found. Please log in.');
        setIsLoading(false);
        router.push('/login');
        return;
      }
      
      // --- DEBUG USER ---
      console.log("Current user:", currentSessionUser);
      console.log("User ID being used in query:", currentSessionUser?.id);
      // --- END DEBUG USER ---

      // Fetch pets for the current user
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', currentSessionUser.id);

      if (petError) {
        console.error('Error fetching pets:', petError);
        setError('Failed to load your pets. Please try refreshing the page.');
        // Continue to fetch draft appointment, pets are not strictly blocking for draft creation
      } else {
        setPets(petData || []);
      }
      
      await fetchDraftAppointment(currentSessionUser.id);
      // setIsLoading(false) will be called within fetchDraftAppointment or after it completes if it doesn't set it.
      // However, fetchDraftAppointment doesn't set it on its own. So set it here.
      setIsLoading(false); 
    };

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // supabase client is stable, router is from next/navigation

  // Effect to set selectedPet when draftAppointment is loaded or changed
  useEffect(() => {
    if (draftAppointment && draftAppointment.pet_id) {
      setSelectedPet(draftAppointment.pet_id);
    } else {
      setSelectedPet(null); // Ensure selectedPet is reset if draft has no pet_id
    }
  }, [draftAppointment]);

  const fetchDraftAppointment = async (userId: string) => {
    if (debug) console.log("Examining appointments table structure...");
    const { data: tableInfo, error: tableError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    if (debug) console.log("Table structure:", tableInfo, "Error (if any):", tableError);
    try {
      // Try to fetch draft with status 'draft' or 'pending'
      let { data: draft, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('pet_owner_id', userId)
        .or('status.eq.draft,status.eq.pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (debug) console.log("Draft fetch result:", draft, fetchError);
      if (fetchError && fetchError.code !== '406' && fetchError.code !== 'PGRST116') {
        console.error('Error fetching appointment:', fetchError);
        setError(`Error fetching booking: ${fetchError.message}. Please try reloading.`);
        setDraftAppointment(null);
        return;
      }
      let newDraftData = null;
      if (!draft) {
        if (debug) console.log("No draft found, creating new draft");
        const { data: newDraft, error: insertError } = await supabase
          .from('appointments')
          .insert({ 
            pet_owner_id: userId,
            status: 'draft',
            created_at: new Date().toISOString(),
            notes: '',
            services: ['1'], // Default service
            total_price: 299, // Default price
            is_in_perth: true, // Default location status
          })
          .select()
          .single();
        if (debug) console.log("New draft creation result:", newDraft, insertError);
        if (insertError) {
          setError(`Error creating draft: ${insertError.message}. Please try reloading.`);
          setDraftAppointment(null);
          return;
        }
        setDraftAppointment(newDraft);
        newDraftData = newDraft;
      } else {
        setDraftAppointment(draft);
      }
      const recordToLog = newDraftData || draft;
      if (recordToLog && debug) {
        console.log('Fetched/Created Appointment Record (structure debug):', JSON.stringify(recordToLog, null, 2));
      }
    } catch (e: any) {
      console.error('Unexpected error in fetchDraftAppointment:', e);
      setError(`An unexpected error occurred: ${e.message}. Please try reloading.`);
      setDraftAppointment(null);
    }
  };

  const handlePetSelect = async (petId: string) => {
    if (!draftAppointment || !draftAppointment.id) {
      setError("Cannot select pet: No booking loaded. Please refresh.");
      return;
    }
    setSelectedPet(petId); // Optimistic update for UI

    const { data: updatedDraft, error: updateError } = await supabase
      .from('appointments')
      .update({ pet_id: petId, updated_at: new Date().toISOString() })
      .eq('id', draftAppointment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating draft appointment with pet_id:', updateError);
      setError(`Error saving pet selection: ${updateError.message}. Please try selecting again.`);
      // Optionally revert selectedPet, though current UI will show selection and an error
      return;
    }

    if (updatedDraft) {
      setDraftAppointment(updatedDraft as DraftAppointment); // Update local draft state
      setError(null); // Clear previous errors on successful update
    } else {
      // Should not happen if updateError is null and select().single() is used
      setError('Failed to update draft appointment with pet selection. Please try again.');
    }
  };

  const handleNext = () => {
    if (!selectedPet || !draftAppointment) {
       // This case should ideally be prevented by the disabled state of the button
      setError("Please select a pet before proceeding."); 
      return;
    }
    // Pet selection is already saved to DB via handlePetSelect
    router.push("/book/services");
  };

  const handleCancelBooking = async () => {
    if (!draftAppointment || !draftAppointment.id) {
      setError("No booking to cancel.");
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this booking draft? This cannot be undone.')) return;
    
    setIsCancelling(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', draftAppointment.id);
    
    setIsCancelling(false);

    if (deleteError) {
      console.error('Error cancelling draft appointment:', deleteError);
      setError(`Failed to cancel booking draft: ${deleteError.message}. Please try again.`);
      return;
    }
    // Successfully cancelled
    router.replace('/portal/bookings');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-md mt-8 text-center p-4">
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          An Error Occurred
        </h2>
        <p className="mb-4">{error}</p>
        <Button
          variant="default"
          onClick={() => {
            setIsLoading(true); 
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                fetchDraftAppointment(session.user.id).finally(() => setIsLoading(false));
              } else {
                setError('Session expired or user not found. Please log in again.');
                setIsLoading(false);
                router.push('/login');
              }
            });
          }}
          className="mr-2"
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/portal/bookings')}
        >
          Go to My Bookings
        </Button>
      </div>
    );
  }

  if (!draftAppointment) {
    return (
      <div className="container mx-auto max-w-md mt-8 text-center p-4">
        <h2 className="text-xl font-semibold mb-2">
          No Draft Appointment Found
        </h2>
        <p className="mb-4">
          We couldn't find an existing draft appointment for you. A new one is being prepared.
        </p>
        <Button
          variant="default"
          onClick={() => {
            setIsLoading(true);
             supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                fetchDraftAppointment(session.user.id).finally(() => setIsLoading(false));
              } else {
                setError('Session expired or user not found. Please log in again.');
                setIsLoading(false);
                router.push('/login');
              }
            });
          }}
        >
          Load Draft
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
        <BookingSteps currentStep="pet" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Select your pet</h1>
          <p className="text-center text-gray-600 mb-8">Select the pet you wish to add to your booking.</p>

          {error && !isCancelling && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">{error}</div>
          )}

          {pets.length > 0 ? (
            <RadioGroup value={selectedPet || ""} onValueChange={handlePetSelect} className="space-y-4 mb-8">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className={`border rounded-lg p-4 flex items-center bg-white hover:border-teal-200 transition-colors cursor-pointer ${
                    selectedPet === pet.id ? "border-teal-500 ring-1 ring-teal-500" : ""
                  }`}
                  onClick={() => handlePetSelect(pet.id)}
                >
                  <RadioGroupItem
                    value={pet.id}
                    id={`pet-${pet.id}`}
                    className="mr-4"
                    onClick={(e) => e.stopPropagation()}
                    checked={selectedPet === pet.id}
                  />
                  <div className="w-[60px] h-[60px] overflow-hidden flex items-center justify-center rounded-md mr-4">
                    {pet.image ? (
                      <Image
                        src={pet.image || "/placeholder.svg"}
                        alt={pet.name}
                        width={60}
                        height={60}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        No img
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{pet.name}</h3>
                    <p className="text-gray-600">{pet.species}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="text-center text-gray-500 mb-8">You have no pets yet. Please add a new pet to continue.</div>
          )}

          <div className="flex justify-center mb-8">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-dashed border-2 hover:bg-teal-50"
              asChild
            >
              <Link href="/book/add-pet">
                <Plus className="h-4 w-4" />
                Add a new pet
              </Link>
            </Button>
          </div>

          <div className="flex justify-between mt-12">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedPet || isLoading || isCancelling}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {isLoading || isCancelling ? "Processing..." : "Next"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
