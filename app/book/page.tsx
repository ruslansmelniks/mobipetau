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

export default function BookAppointment() {
  const user = useUser();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [missingDraft, setMissingDraft] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setMissingDraft(false);
    // Fetch pets
    supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id)
      .then(({ data, error }) => {
        setPets(data || []);
        setLoading(false);
        if (error) setError('Failed to load pets. Please try again.');
      });

    // Create or fetch existing draft appointment
    const createDraftAppointment = async () => {
      setError(null);
      setMissingDraft(false);
      const { data: existingDraft, error: fetchError } = await supabase
        .from('appointments')
        .select('id')
        .eq('pet_owner_id', user.id)
        .eq('status', 'pending')
        .single();
      if (fetchError) {
        setError('Failed to fetch draft appointment. Please try again.');
        return;
      }
      if (!existingDraft) {
        setMissingDraft(true);
        setTimeout(() => {
          router.replace('/book');
        }, 2000);
        return;
      }
      setDraftId(existingDraft.id);
    };

    createDraftAppointment();
  }, [user]);

  const handlePetSelect = (petId: string) => {
    setSelectedPet(petId);
  };

  const handleNext = async () => {
    if (!selectedPet || !draftId) return;
    setError(null);
    const { error } = await supabase
      .from('appointments')
      .update({ pet_id: selectedPet })
      .eq('id', draftId);
    if (error) {
      setError('Error updating draft appointment. Please try again.');
      return;
    }
    router.push("/book/services");
  };

  const handleCancelBooking = async () => {
    if (!draftId) return;
    if (!window.confirm('Are you sure you want to cancel this booking? This cannot be undone.')) return;
    setIsCancelling(true);
    await supabase.from('appointments').delete().eq('id', draftId);
    setIsCancelling(false);
    router.replace('/portal/bookings');
  };

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

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">{error}</div>
          )}

          {missingDraft && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4 text-center">
              Your booking draft was not found. Redirecting to start...
            </div>
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
                  {pet.image ? (
                    <Image
                      src={pet.image || "/placeholder.svg"}
                      alt={pet.name}
                      width={60}
                      height={60}
                      className="rounded-md mr-4 object-cover"
                    />
                  ) : (
                    <div className="w-[60px] h-[60px] bg-gray-200 rounded-md mr-4 flex items-center justify-center text-gray-400">
                      No img
                    </div>
                  )}
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
              disabled={!selectedPet}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
