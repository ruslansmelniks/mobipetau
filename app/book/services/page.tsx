"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useUser } from "@supabase/auth-helpers-react"

// Sample services data
const services = [
  {
    id: "1",
    title: "After hours home visit",
    description: "A qualified vet will be prioritised to come to urgently assist your pet in the event of an emergency",
    price: 299,
  },
  {
    id: "2",
    title: "At-Home Peaceful Euthanasia",
    description:
      "A compassionate, gentle farewell for your pet in the comfort and familiarity of home, ensuring their final moments are peaceful and surrounded by loved ones",
    price: 599,
  },
]

export default function SelectServices() {
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [issueDescription, setIssueDescription] = useState("")
  const [draftId, setDraftId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [missingDraft, setMissingDraft] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    if (!user) return;
    setError(null);
    setMissingDraft(false);
    // Fetch existing draft appointment
    const fetchDraftAppointment = async () => {
      const { data: draft, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('pet_owner_id', user.id)
        .eq('status', 'pending')
        .single();
      if (fetchError) {
        setError('Failed to fetch draft appointment. Please try again.');
        return;
      }
      if (!draft) {
        setMissingDraft(true);
        setTimeout(() => {
          router.replace('/book');
        }, 2000);
        return;
      }
      setDraftId(draft.id);
      if (draft.services) {
        setSelectedServices(draft.services);
      }
      if (draft.notes) {
        setIssueDescription(draft.notes);
      }
    };
    fetchDraftAppointment();
  }, [user]);

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const calculateTotal = () => {
    return services
      .filter((service) => selectedServices.includes(service.id))
      .reduce((total, service) => total + service.price, 0)
  }

  const handleNext = async () => {
    if (selectedServices.length === 0 || !draftId) return;
    setError(null);
    const { error } = await supabase
      .from('appointments')
      .update({
        services: selectedServices,
        notes: issueDescription,
        total_price: calculateTotal()
      })
      .eq('id', draftId);
    if (error) {
      setError('Error updating draft appointment. Please try again.');
      return;
    }
    router.push("/book/appointment");
  }

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
        <BookingSteps currentStep="services" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Select services</h1>
          <p className="text-center text-gray-600 mb-8">
            A qualified vet will come to assist your pet in a relaxed and familiar environment.
          </p>

          <div className="space-y-4 mb-8">
            {services.map((service) => (
              <div
                key={service.id}
                className={`border rounded-lg p-6 bg-white hover:border-teal-200 transition-colors cursor-pointer ${
                  selectedServices.includes(service.id) ? "border-teal-500 ring-1 ring-teal-500" : ""
                }`}
                onClick={() => toggleServiceSelection(service.id)}
              >
                <div className="flex items-start">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleServiceSelection(service.id)}
                    className="mr-4 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg">{service.title}</h3>
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
              Describe your pet's issue
            </Label>
            <Textarea
              id="issue-description"
              placeholder="Please provide details about your pet's condition, symptoms, or any specific concerns you have. This will help the vet prepare for the visit."
              className="min-h-[120px] resize-y"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-2">
              The more information you provide, the better prepared our vet will be to help your pet.
            </p>
          </div>

          {selectedServices.length > 0 && (
            <div className="bg-white p-4 rounded-lg border mb-8">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-semibold text-lg">${calculateTotal()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-12">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/book">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedServices.length === 0}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              Next
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">{error}</div>
          )}

          {missingDraft && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4 text-center">
              Your booking draft was not found. Redirecting to start...
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
