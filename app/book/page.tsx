"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Plus, Dog, Cat, PawPrint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useDraftAppointment } from '@/hooks/useDraftAppointment'
import { BookingWarning } from "@/components/booking-warning"

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
  const { draftAppointment, isLoading, error: draftError, updateDraftAppointment, refetch } = useDraftAppointment();
  const debug = true;

  useEffect(() => {
    const fetchPets = async () => {
      setPets([]);
      setSelectedPet(null);
      setError(null);
      if (!authUser) return;
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', authUser.id);
      if (petError) {
        setError('Failed to load your pets. Please try refreshing the page.');
      } else {
        setPets(petData || []);
      }
    };
    fetchPets();
  }, [authUser, supabase]);

  useEffect(() => {
    if (draftAppointment && draftAppointment.pet_id) {
      setSelectedPet(draftAppointment.pet_id);
    } else {
      setSelectedPet(null);
    }
  }, [draftAppointment]);

  const handlePetSelect = async (petId: string) => {
    if (!draftAppointment || !draftAppointment.id) {
      setError("Cannot select pet: No booking loaded. Please refresh.");
      return;
    }
    setSelectedPet(petId);
    try {
      const updatedDraft = await updateDraftAppointment({ pet_id: petId });
      setError(null);
    } catch (updateError: any) {
      setError(`Error saving pet selection: ${updateError.message}. Please try selecting again.`);
    }
  };

  const handleNext = async () => {
    if (!selectedPet || !draftAppointment) {
      setError("Please select a pet before proceeding.");
      return;
    }
    setError(null);
    try {
      await updateDraftAppointment({ pet_id: selectedPet });
      router.push("/book/services");
    } catch (err: any) {
      setError('Error updating pet selection. Please try again.');
    }
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
      setError(`Failed to cancel booking draft: ${deleteError.message}. Please try again.`);
      return;
    }
    router.replace('/portal/bookings');
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Please log in to continue booking</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || draftError) {
    return (
      <div className="container mx-auto max-w-md mt-8 text-center p-4">
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          An Error Occurred
        </h2>
        <p className="mb-4">{error || draftError}</p>
        <Button
          variant="default"
          onClick={() => {
            setError(null);
            refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!draftAppointment) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

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
        <BookingSteps currentStep="pet" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Select your pet</h1>
          <p className="text-center text-gray-600 mb-8">Select the pet you wish to add to your booking.</p>

          {error && !isCancelling && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">{error}</div>
          )}

          {pets.length > 0 ? (
            <RadioGroup
              value={selectedPet || ""}
              onValueChange={handlePetSelect}
              className="space-y-4 mb-8"
            >
              {pets.map((pet) => {
                // Determine species icon
                let speciesIcon = <PawPrint className="inline-block h-4 w-4 text-teal-600 mr-1" />;
                if (pet.species?.toLowerCase().includes("dog")) speciesIcon = <Dog className="inline-block h-4 w-4 text-teal-600 mr-1" />;
                if (pet.species?.toLowerCase().includes("cat")) speciesIcon = <Cat className="inline-block h-4 w-4 text-teal-600 mr-1" />;
                // Gender icon
                let genderIcon = null;
                if (pet.gender?.toLowerCase() === "male" || pet.gender === "M") genderIcon = <span className="inline-block text-blue-500 mr-1" title="Male">♂</span>;
                if (pet.gender?.toLowerCase() === "female" || pet.gender === "F") genderIcon = <span className="inline-block text-pink-500 mr-1" title="Female">♀</span>;
                // Age string
                let ageString = pet.age ? pet.age : (pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : null);
                return (
                  <div
                    key={pet.id}
                    className={`border rounded-xl p-4 flex flex-row items-center bg-white transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-teal-300 group min-h-[100px] relative ${selectedPet === pet.id ? "border-teal-500 ring-2 ring-teal-400 shadow-lg" : ""}`}
                    onClick={() => handlePetSelect(pet.id)}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center mr-4">
                      <RadioGroupItem
                        value={pet.id}
                        id={`pet-${pet.id}`}
                        onClick={e => e.stopPropagation()}
                        checked={selectedPet === pet.id}
                      />
                    </div>
                    <div className="w-[72px] h-[72px] overflow-hidden flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 mr-6 flex-shrink-0">
                      {pet.image ? (
                        <Image
                          src={pet.image || "/placeholder.svg"}
                          alt={pet.name}
                          width={72}
                          height={72}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {speciesIcon}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-semibold text-lg mb-1 truncate">{pet.name}</h3>
                      <div className="text-gray-600 text-sm flex items-center mb-1">
                        {speciesIcon}
                        <span className="truncate">{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</span>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-2">
                        {genderIcon}
                        {pet.gender && <span>{pet.gender[0].toUpperCase()}</span>}
                        {pet.gender && ageString && <span className="mx-1">•</span>}
                        {ageString && <span>{ageString}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
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

        <BookingWarning />
      </main>
    </div>
  )
}

function calculateAge(dateOfBirth: string): string {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  if (years < 1) {
    const months = years * 12 + monthDiff;
    return `${months} months`;
  }
  return `${years} years`;
}
