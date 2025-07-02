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
import { SmartLogo } from "@/components/smart-logo"

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
  console.log('BookAppointment - Component rendering');
  
  const user = useUser();
  const supabase = useSupabaseClient();
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const debug = true;

  // Add debugging statements
  console.log('BookAppointment - User:', user);
  console.log('BookAppointment - Supabase Client:', supabase);

  useEffect(() => {
    if (user !== undefined) {
      setLoadingUser(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('BookAppointment - Pets effect running');
    const fetchPets = async () => {
      setPets([]);
      setSelectedPet(null);
      setError(null);
      if (!user) {
        console.log('BookAppointment - No user, skipping pets fetch');
        return;
      }

      console.log('BookAppointment - Fetching pets for user:', user.id);
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id);
      
      console.log('BookAppointment - Pets fetch response:', { petData, petError });
      
      if (petError) {
        setError('Failed to load your pets. Please try refreshing the page.');
      } else {
        setPets(petData || []);
      }
    };
    fetchPets();
  }, [user, supabase]);

  useEffect(() => {
    if (selectedPet) {
      setError(null);
    }
  }, [selectedPet]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      console.log('BookAppointment - Document Cookie:', document.cookie);
    }
  }, []);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace('/login');
    }
  }, [loadingUser, user, router]);

  const handlePetSelect = async (petId: string) => {
    setSelectedPet(petId);
    setError(null);
  };

  const handleNext = async () => {
    if (!selectedPet) {
      setError("Please select a pet before proceeding.");
      return;
    }
    setError(null);
    try {
      sessionStorage.setItem('booking_pet_id', selectedPet);
      router.push("/book/services");
    } catch (err: any) {
      setError('Error updating pet selection. Please try again.');
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedPet) {
      setError("No booking to cancel.");
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this booking draft? This cannot be undone.')) return;
    setIsCancelling(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', selectedPet);
    setIsCancelling(false);
    if (deleteError) {
      setError(`Failed to cancel booking draft: ${deleteError.message}. Please try again.`);
      return;
    }
    router.replace('/portal/bookings');
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4e968f] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
            setError(null);
          }}
        >
          Retry
        </Button>
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
                // Calculate age display
                const getAgeDisplay = (pet: any) => {
                  if (pet.age && pet.age_unit) {
                    const unit = pet.age_unit === 'years' ? 'yr' : pet.age_unit === 'months' ? 'mo' : pet.age_unit;
                    return `${pet.age} ${unit}${pet.age > 1 ? 's' : ''}`;
                  } else if (pet.date_of_birth) {
                    return calculateAge(pet.date_of_birth);
                  }
                  return null;
                };

                // Get gender display
                const getGenderDisplay = (gender: string) => {
                  const genderMap: Record<string, { icon: string; label: string; color: string }> = {
                    'male': { icon: '♂', label: 'Male', color: 'text-blue-500' },
                    'female': { icon: '♀', label: 'Female', color: 'text-pink-500' },
                    'unknown': { icon: '?', label: 'Unknown', color: 'text-gray-400' }
                  };
                  return genderMap[gender?.toLowerCase()] || genderMap['unknown'];
                };

                const ageDisplay = getAgeDisplay(pet);
                const genderInfo = getGenderDisplay(pet.gender);

                return (
                  <div
                    key={pet.id}
                    className={`border rounded-xl p-5 flex flex-row items-center bg-white transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-teal-300 group relative ${
                      selectedPet === pet.id ? "border-teal-500 ring-2 ring-teal-400 shadow-lg" : ""
                    }`}
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

                    {/* Pet Image */}
                    <div className="w-20 h-20 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 mr-4 flex-shrink-0">
                      {pet.image ? (
                        <Image
                          src={pet.image}
                          alt={pet.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {pet.type?.toLowerCase() === 'dog' ? (
                            <Dog className="h-8 w-8 text-gray-400" />
                          ) : pet.type?.toLowerCase() === 'cat' ? (
                            <Cat className="h-8 w-8 text-gray-400" />
                          ) : (
                            <PawPrint className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pet Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-lg text-gray-900">{pet.name}</h3>
                      </div>

                      {/* Species and Breed */}
                      <p className="text-sm text-gray-600 mb-2">
                        {pet.type || 'Pet'}
                        {pet.breed && ` • ${pet.breed}`}
                      </p>

                      {/* Additional Info Row */}
                      <div className="flex items-center gap-4 text-sm">
                        {/* Gender */}
                        {pet.gender && (
                          <div className="flex items-center gap-1">
                            <span className={`text-lg ${genderInfo.color}`} title={genderInfo.label}>
                              {genderInfo.icon}
                            </span>
                            <span className="text-gray-600">{genderInfo.label}</span>
                          </div>
                        )}

                        {/* Age */}
                        {ageDisplay && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <span>{ageDisplay} old</span>
                          </div>
                        )}

                        {/* Weight */}
                        {pet.weight && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <span>{pet.weight} lbs</span>
                          </div>
                        )}
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
              disabled={!selectedPet || isCancelling}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {isCancelling ? "Processing..." : "Next"}
            </Button>
          </div>
        </div>
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
