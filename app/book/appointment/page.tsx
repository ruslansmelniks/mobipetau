"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BookingSteps } from "@/components/booking-steps"
import { useRouter } from "next/navigation"
import { useSupabaseClient, useUser, useSessionContext } from "@supabase/auth-helpers-react"
import GoogleMapsAutocomplete from '@/components/ui/GoogleMapsAutocomplete'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

// Time slot options based on time of day
const timeSlots = {
  morning: ["06:00 - 08:00 AM", "08:00 - 10:00 AM"],
  afternoon: ["10:00 AM - 12:00 PM", "12:00 - 02:00 PM", "02:00 - 05:00 PM"],
  evening: ["05:00 - 06:30 PM", "06:30 - 08:00 PM"],
}

// Perth suburb list - expanded with postal codes
const perthSuburbs = [
  { name: "Perth", postalCodes: ["6000", "6001"] },
  { name: "West Perth", postalCodes: ["6005"] },
  { name: "East Perth", postalCodes: ["6004"] },
  { name: "Northbridge", postalCodes: ["6003"] },
  { name: "Subiaco", postalCodes: ["6008"] },
  { name: "Leederville", postalCodes: ["6007"] },
  { name: "Mount Lawley", postalCodes: ["6050"] },
  { name: "North Perth", postalCodes: ["6006"] },
  { name: "South Perth", postalCodes: ["6151"] },
  { name: "Victoria Park", postalCodes: ["6100"] },
  { name: "Fremantle", postalCodes: ["6160"] },
  { name: "Cottesloe", postalCodes: ["6011"] },
  { name: "Scarborough", postalCodes: ["6019"] },
  { name: "Karrinyup", postalCodes: ["6018"] },
  { name: "Nedlands", postalCodes: ["6009"] },
  { name: "Claremont", postalCodes: ["6010"] },
  { name: "Dalkeith", postalCodes: ["6009"] },
  { name: "Wembley", postalCodes: ["6014"] },
  { name: "City Beach", postalCodes: ["6015"] },
  { name: "Floreat", postalCodes: ["6014"] }
];

// Common Perth street names for search suggestions
const commonStreets = [
  "Hay Street", "St Georges Terrace", "Adelaide Terrace", "Wellington Street", 
  "Murray Street", "Barrack Street", "William Street", "Beaufort Street",
  "Albany Highway", "Canning Highway", "Stirling Highway", "Mounts Bay Road",
  "Riverside Drive", "Kings Park Road", "Thomas Street"
];

// Updated function to check if address is in Perth
const checkIfInPerth = (addressStr: string): boolean => {
  if (!addressStr) return false;
  addressStr = addressStr.toLowerCase();
  const containsPerth = addressStr.includes("perth") || 
                       addressStr.includes("wa") || 
                       addressStr.includes("western australia") ||
                       /\b60\d\d\b/.test(addressStr); // Perth area postal codes often start with 60xx
  const containsPerthSuburb = perthSuburbs.some(suburb => 
    addressStr.includes(suburb.name.toLowerCase())
  );
  const postalCodeMatch = addressStr.match(/\b(\d{4})\b/);
  const isPerthPostalCode = !!(postalCodeMatch && 
    perthSuburbs.some(suburb => suburb.postalCodes.includes(postalCodeMatch[1])));
  const isInPerthArea = containsPerth || containsPerthSuburb || isPerthPostalCode;
  console.log("Address Perth check:", {addressStr, isInPerthArea});
  return isInPerthArea;
};

// Function to get address suggestions based on input
const getAddressSuggestions = (input: string): string[] => {
  if (!input || input.length < 3) return [];
  const inputLower = input.toLowerCase();
  let suggestions: string[] = [];
  // First try to match street names
  commonStreets.forEach(street => {
    if (street.toLowerCase().includes(inputLower)) {
      // Add variations with different suburbs
      perthSuburbs.slice(0, 5).forEach(suburb => {
        suggestions.push(`${street}, ${suburb.name}, WA ${suburb.postalCodes[0]}, Australia`);
      });
    }
  });
  // If no street matches, try to match suburbs
  if (suggestions.length === 0) {
    perthSuburbs.forEach(suburb => {
      if (suburb.name.toLowerCase().includes(inputLower)) {
        suggestions.push(`${suburb.name}, Western Australia, ${suburb.postalCodes[0]}, Australia`);
      }
    });
  }
  // If we have partial matches for both streets and suburbs, create combinations
  if (suggestions.length === 0) {
    // Find street name parts
    const matchingStreets = commonStreets.filter(street => 
      inputLower.split(' ').some(part => 
        street.toLowerCase().includes(part) && part.length > 2
      )
    );
    // Find suburb name parts
    const matchingSuburbs = perthSuburbs.filter(suburb => 
      inputLower.split(' ').some(part => 
        suburb.name.toLowerCase().includes(part) && part.length > 2
      )
    );
    // Create combinations
    matchingStreets.slice(0, 3).forEach(street => {
      matchingSuburbs.slice(0, 3).forEach(suburb => {
        suggestions.push(`${street}, ${suburb.name}, WA ${suburb.postalCodes[0]}, Australia`);
      });
    });
  }
  // Add some specific suggestions if input looks like an address number
  if (/^\d+\s/.test(input)) {
    const number = input.match(/^\d+/)?.[0];
    commonStreets.slice(0, 3).forEach(street => {
      suggestions.push(`${number} ${street}, Perth, WA 6000, Australia`);
    });
  }
  // Limit suggestions and ensure uniqueness
  suggestions = [...new Set(suggestions)].slice(0, 5);
  console.log("Address suggestions:", suggestions);
  return suggestions;
};

export default function AppointmentDetails() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const { isLoading: sessionLoading } = useSessionContext()
  const user = useUser()

  // Form state
  const [address, setAddress] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isInPerth, setIsInPerth] = useState(true)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [addressLatLng, setAddressLatLng] = useState<{ lat: number, lng: number } | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPerthWarning, setShowPerthWarning] = useState(false)

  // Function to check if an address is in Perth
  const checkIfInPerth = (addressStr: string) => {
    addressStr = addressStr.toLowerCase();
    
    // Check if the address contains "perth" or any Perth suburb
    const containsPerth = addressStr.includes("perth") || 
                          addressStr.includes("wa") || 
                          addressStr.includes("western australia");
                          
    const containsPerthSuburb = perthSuburbs.some(suburb => 
      addressStr.includes(suburb.name.toLowerCase())
    );
    
    const isInPerthArea = containsPerth || containsPerthSuburb;
    
    setIsInPerth(isInPerthArea);
    setShowPerthWarning(!isInPerthArea);
    
    return isInPerthArea;
  };

  // Geocode address using OpenStreetMap Nominatim
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    // Check if address is in Perth area
    const isPerthAddress = checkIfInPerth(val);
    setIsInPerth(isPerthAddress);
    setShowPerthWarning(!isPerthAddress && val.length > 5);
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult, latLng: { lat: number, lng: number }) => {
    setAddressLatLng(latLng);
    if (place.formatted_address) {
      setAddress(place.formatted_address);
      const isPerthAddress = checkIfInPerth(place.formatted_address);
      setIsInPerth(isPerthAddress);
      setShowPerthWarning(!isPerthAddress && place.formatted_address.length > 5);
    }
  };

  // Load or create draft appointment
  useEffect(() => {
    const fetchOrCreateDraft = async () => {
      if (sessionLoading) {
        console.log("Session is still loading, waiting...");
        return;
      }
      if (!user) {
        console.log("No user found after session loaded");
        setLoading(false);
        setError("User not authenticated. Please log in again.");
        return;
      }
      console.log("User authenticated:", user.id);
      try {
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          setLoading(false);
          setError("Session error. Please log in again.");
          return;
        }
        console.log("Fetching draft appointment for user:", user.id);
        
        // Try to fetch existing draft
        const { data: draft, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('pet_owner_id', user.id)
          .or('status.eq.draft,status.eq.pending')
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error fetching draft:", fetchError);
          setError('Failed to fetch appointment details.');
          setLoading(false);
          return;
        }
        
        if (!draft) {
          console.log("No draft found, creating new draft");
          
          // Create a new draft
          const { data: newDraft, error: createError } = await supabase
            .from('appointments')
            .insert({
              pet_owner_id: user.id,
              status: 'pending',
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Error creating draft:", createError);
            setError('Failed to create appointment.');
            setLoading(false);
            return;
          }
          
          setDraftId(newDraft.id);
          console.log("Created new draft:", newDraft.id);
        } else {
          console.log("Found existing draft:", draft.id);
          setDraftId(draft.id);
          
          // Populate form with existing data
          if (draft.address) {
            setAddress(draft.address);
            checkIfInPerth(draft.address);
          }
          if (draft.additional_info) setAdditionalInfo(draft.additional_info);
          if (draft.date) setDate(new Date(draft.date));
          if (draft.time_of_day) setTimeOfDay(draft.time_of_day);
          if (draft.time_slot) setSelectedTimeSlot(draft.time_slot);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrCreateDraft();
  }, [user, supabase, sessionLoading]);

  // Save the appointment data and proceed
  const handleNext = async () => {
    if (!draftId) {
      setError("No draft appointment found.");
      return;
    }

    if (!address || !date || !timeOfDay || !selectedTimeSlot) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isInPerth) {
      setShowPerthWarning(true);
      return;
    }

    try {
      setLoading(true);
      console.log("Updating appointment:", draftId);
      
      // Create update data
      const updateData = {
        address,
        additional_info: additionalInfo,
        date: date.toISOString(),
        time_slot: selectedTimeSlot,
        time_of_day: timeOfDay,
        is_in_perth: isInPerth,
        updated_at: new Date().toISOString()
      };
      
      console.log("Update data:", updateData);
      
      // Update the record in the database first
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', draftId);

      if (updateError) {
        console.error("Error updating appointment:", updateError);
        setError('Failed to save appointment details.');
        setLoading(false);
        return;
      }
      
      console.log("Appointment details updated successfully, navigating to payment confirmation page");
      
      // Make sure we don't have any pending state updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use window.location for a reliable navigation
      window.location.href = "/book/payment";
    } catch (err) {
      console.error("Error in handleNext:", err);
      setError('An unexpected error occurred while saving.');
      setLoading(false);
    }
  };

  // Reset time slot when time of day changes
  useEffect(() => {
    setSelectedTimeSlot(null);
  }, [timeOfDay]);

  // Loading state
  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div id="appointment-container" className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <Link href="/" className="flex justify-center md:justify-start">
            <Image 
              src="/logo.png" 
              alt="MobiPet Logo" 
              width={96} 
              height={32} 
              className="h-[32px] w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="appointment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Appointment details</h1>
          <p className="text-center text-gray-600 mb-8">Please provide your address and preferred appointment time.</p>

          {error && error.includes("authenticated") && (
            <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-md mb-6">
              {error}
              <div className="mt-4">
                <Button 
                  onClick={() => window.location.href = "/login?redirect=/book/appointment"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Log in again
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Address Section */}
            <div className="bg-white p-6 rounded-lg border">
              <Label htmlFor="address" className="text-base font-medium mb-2 block">
                Enter your address <span className="text-gray-500 text-sm">(limited to Perth area)</span>
              </Label>
              <GoogleMapsAutocomplete
                value={address}
                onChange={handleAddressChange}
                onPlaceSelected={handlePlaceSelected}
                disabled={loading}
              />
              {showPerthWarning && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md mb-4 mt-4">
                  <p className="font-medium">Address not recognized as Perth area</p>
                  <p className="text-sm mt-1">MobiPet currently only serves the Perth metropolitan area. Please enter a Perth address.</p>
                </div>
              )}
              <Label htmlFor="additional-info" className="text-base font-medium mb-2 block mt-4">
                Additional information about your location
              </Label>
              <Textarea
                id="additional-info"
                placeholder="E.g., gate code, parking instructions, or landmarks to help the vet find your home"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="resize-none h-24"
              />
            </div>

            {/* Date and Time Section */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium mb-2 block">Appointment date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={
                          `w-full flex items-center justify-between border rounded-md px-3 py-2 h-10 bg-white text-left text-base focus:outline-none focus:ring-2 focus:ring-teal-500 ${!date ? 'text-muted-foreground' : ''}`
                        }
                      >
                        {date ? format(date, "dd/MM/yyyy") : <span>Select a date</span>}
                        <CalendarIcon className="ml-2 h-5 w-5 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(day) => day < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-base font-medium mb-2 block">Preferred time of the day</Label>
                  <RadioGroup
                    value={timeOfDay || ""}
                    onValueChange={(value) => setTimeOfDay(value as "morning" | "afternoon" | "evening")}
                    className="flex flex-wrap gap-2"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <RadioGroupItem value="morning" id="morning" className="peer hidden" />
                      <label
                        htmlFor="morning"
                        className={`flex items-center justify-center h-10 w-full border rounded-md px-3 py-2 cursor-pointer transition-colors duration-150
                          ${timeOfDay === 'morning' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow' : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200'}`}
                      >
                        Morning
                      </label>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <RadioGroupItem value="afternoon" id="afternoon" className="peer hidden" />
                      <label
                        htmlFor="afternoon"
                        className={`flex items-center justify-center h-10 w-full border rounded-md px-3 py-2 cursor-pointer transition-colors duration-150
                          ${timeOfDay === 'afternoon' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow' : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200'}`}
                      >
                        Afternoon
                      </label>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <RadioGroupItem value="evening" id="evening" className="peer hidden" />
                      <label
                        htmlFor="evening"
                        className={`flex items-center justify-center h-10 w-full border rounded-md px-3 py-2 cursor-pointer transition-colors duration-150
                          ${timeOfDay === 'evening' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow' : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200'}`}
                      >
                        Evening
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Time Slots */}
              {timeOfDay && (
                <div className="mt-6">
                  <Label className="text-base font-medium mb-2 block">Available time slots</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {timeSlots[timeOfDay].map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant="outline"
                        className={`justify-center ${
                          selectedTimeSlot === slot ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200"
                        }`}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-12">
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/book/services">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              onClick={handleNext}
              disabled={!address || !date || !timeOfDay || !selectedTimeSlot || !isInPerth || loading}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              {loading ? "Saving..." : "Review details"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
