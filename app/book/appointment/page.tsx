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
import { supabase } from '@/lib/supabase'
import GoogleMapsAutocomplete from '@/components/ui/GoogleMapsAutocomplete'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartLogo } from "@/components/smart-logo"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

// Time slot options based on time of day
const timeSlots = [
  '06:00 - 08:00 AM',
  '08:00 - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 - 02:00 PM',
  '02:00 - 04:00 PM',
  '04:00 - 06:00 PM',
  '06:00 - 08:00 PM',
]

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
  const [user, setUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Form state with proper initial values
  const [address, setAddress] = useState<string>('')
  const [additionalInfo, setAdditionalInfo] = useState<string>('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>(
    'morning'
  )
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isInPerth, setIsInPerth] = useState<boolean>(true)
  const [addressLatLng, setAddressLatLng] = useState<{ lat: number; lng: number } | null>(null)
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true)
  const [showPerthWarning, setShowPerthWarning] = useState<boolean>(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setSessionLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setLoading(false)
    // Load previous step data from sessionStorage
    const petId = sessionStorage.getItem('booking_pet_id');
    const serviceIds = JSON.parse(sessionStorage.getItem('booking_service_ids') || '[]');
    const issueDescription = sessionStorage.getItem('booking_issue_description') || '';
    // Optionally, set these to state or validate
  }, [])

  const handleNext = async () => {
    if (!date || !selectedTimeSlot) {
      return;
    }
    try {
      sessionStorage.setItem('booking_address', address);
      sessionStorage.setItem('booking_date', date.toISOString());
      sessionStorage.setItem('booking_time_slot', selectedTimeSlot);
      sessionStorage.setItem('booking_time_of_day', timeOfDay);
      sessionStorage.setItem('booking_additional_info', additionalInfo);
      sessionStorage.setItem('booking_is_in_perth', JSON.stringify(isInPerth));
      if (addressLatLng) {
        sessionStorage.setItem('booking_latitude', addressLatLng.lat.toString());
        sessionStorage.setItem('booking_longitude', addressLatLng.lng.toString());
      }
      router.push('/book/payment');
    } catch (err) {
      // error is handled by the hook
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Please log in to continue booking</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading appointment details...</p>
      </div>
    );
  }

  // Main component render
  return (
    <div id="appointment-container" className="min-h-screen bg-gray-50 flex flex-col">
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
        <BookingSteps currentStep="appointment" />

        <div className="max-w-3xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Appointment details</h1>
          <p className="text-center text-gray-600 mb-8">Please provide your address and preferred appointment time.</p>

          <div className="space-y-6">
            {/* Address Section */}
            <div className="bg-white p-6 rounded-lg border">
              <Label htmlFor="address" className="text-base font-medium mb-2 block">
                Enter your address <span className="text-gray-500 text-sm">(limited to Perth area)</span>
              </Label>
              <GoogleMapsAutocomplete
                value={address}
                onChange={setAddress}
                onPlaceSelected={(place, latLng) => {
                  setAddressLatLng(latLng);
                  if (place.formatted_address) {
                    setAddress(place.formatted_address);
                    const isPerthAddress = checkIfInPerth(place.formatted_address);
                    setIsInPerth(isPerthAddress);
                    setShowPerthWarning(!isPerthAddress && place.formatted_address.length > 5);
                  }
                }}
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
                onChange={(e) => {
                  console.log('Additional info changed:', e.target.value);
                  setAdditionalInfo(e.target.value);
                }}
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
                        {date ? format(date, "dd/MM/yyyy") : "Select a date"}
                        <CalendarIcon className="ml-2 h-5 w-5 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          console.log('Date selected:', newDate);
                          setDate(newDate);
                        }}
                        disabled={(day) => day < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-base font-medium mb-2 block">Preferred time of the day</Label>
                  <Select
                    value={timeOfDay}
                    onValueChange={(value: 'morning' | 'afternoon' | 'evening') => {
                      setTimeOfDay(value);
                      setSelectedTimeSlot(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time of day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Time Slots */}
              {timeOfDay && (
                <div className="mt-6">
                  <Label className="text-base font-medium mb-2 block">Available time slots</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {timeSlots.map((slot) => {
                      const [startTime] = slot.split(' - ');
                      const hour = parseInt(startTime.split(':')[0]);
                      const isMorning = hour < 10;
                      const isAfternoon = hour >= 10 && hour < 17;
                      const isEvening = hour >= 17;

                      const showSlot =
                        (timeOfDay === 'morning' && isMorning) ||
                        (timeOfDay === 'afternoon' && isAfternoon) ||
                        (timeOfDay === 'evening' && isEvening);

                      if (!showSlot) return null;

                      return (
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
                      );
                    })}
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
              disabled={!date || !selectedTimeSlot || !address}
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
