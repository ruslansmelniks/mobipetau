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
import { supabase } from '@/lib/supabase'
import { SmartLogo } from "@/components/smart-logo"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

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
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [issueDescription, setIssueDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false); // For Next button loading state
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateTotal = useCallback(() => {
    if (!allServices.length || !selectedServiceIds.length) return 0;
    return allServices
      .filter((service) => selectedServiceIds.includes(service.id))
      .reduce((total, service) => total + service.price, 0);
  }, [allServices, selectedServiceIds]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    setAllServices(services);
    // Load selected pet from sessionStorage (optional, for validation)
    const petId = sessionStorage.getItem('booking_pet_id');
    // Optionally, redirect if not found
  }, [user]);

  const handleServiceToggle = async (serviceId: string) => {
    const newSelectedServiceIds = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    setSelectedServiceIds(newSelectedServiceIds);
  };

  const handleNext = async () => {
    if (selectedServiceIds.length === 0) return;
    setError(null);
    try {
      setIsSaving(true);
      sessionStorage.setItem('booking_service_ids', JSON.stringify(selectedServiceIds));
      sessionStorage.setItem('booking_issue_description', issueDescription);
      router.push("/book/appointment");
    } catch (err: any) {
      setError('Error updating services. Please try again.');
    }
    setIsSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Please log in to continue booking</p>
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
          <div className="flex items-center justify-between w-full">
            <SmartLogo noLink />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary">Cancel booking</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this booking? All progress will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep booking</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => {
                      if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('booking_pet_id');
                        sessionStorage.removeItem('booking_service_ids');
                        sessionStorage.removeItem('booking_issue_description');
                        sessionStorage.removeItem('booking_address');
                        sessionStorage.removeItem('booking_date');
                        sessionStorage.removeItem('booking_time_slot');
                        sessionStorage.removeItem('booking_time_of_day');
                        sessionStorage.removeItem('booking_additional_info');
                        sessionStorage.removeItem('booking_is_in_perth');
                        sessionStorage.removeItem('booking_latitude');
                        sessionStorage.removeItem('booking_longitude');
                      }
                      window.location.href = '/portal/bookings';
                    }}>Yes, cancel</Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
              disabled={selectedServiceIds.length === 0 || isSaving}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {isSaving ? (
                <>
                  <span className="mr-2">Processing...</span>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
          
          {/* General error display, if not related to saving */}
          {error && !isSaving && (
             <div className="bg-red-100 text-red-700 p-4 rounded mt-4 text-center">{error}</div>
          )}

        </div>
      </main>
    </div>
  )
}
