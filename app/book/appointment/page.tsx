"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { BookingSteps } from "@/components/booking-steps"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "next/navigation"
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { loadStripe } from '@stripe/stripe-js'
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useUser } from "@supabase/auth-helpers-react"

// Time slot options based on time of day
const timeSlots = {
  morning: ["06:00 - 08:00 AM", "08:00 - 10:00 AM"],
  afternoon: ["10:00 AM - 12:00 PM", "12:00 - 02:00 PM", "02:00 - 05:00 PM"],
  evening: ["05:00 - 06:30 PM", "06:30 - 08:00 PM"],
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const center = {
  lat: -31.9505, // Perth latitude
  lng: 115.8605  // Perth longitude
};

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!googleMapsApiKey) throw new Error("Google Maps API key is missing");

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function AppointmentDetails() {
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [mapCoordinates, setMapCoordinates] = useState({ lat: -31.9523, lng: 115.8613 })
  const [marker, setMarker] = useState(center)
  const [draftId, setDraftId] = useState<string | null>(null)
  const autocompleteRef = useRef<any>(null)
  const [isInPerth, setIsInPerth] = useState(true)
  const supabase = useSupabaseClient()
  const user = useUser()
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [missingDraft, setMissingDraft] = useState(false)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey!,
    libraries: ['places'],
  });

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
      if (draft.address) {
        setAddress(draft.address);
      }
      if (draft.additional_info) {
        setAdditionalInfo(draft.additional_info);
      }
      if (draft.date) {
        setDate(new Date(draft.date));
      }
      if (draft.time_slot) {
        setSelectedTimeSlot(draft.time_slot);
        // Set time of day based on time slot
        const hour = parseInt(draft.time_slot.split(':')[0]);
        if (hour < 10) setTimeOfDay('morning');
        else if (hour < 17) setTimeOfDay('afternoon');
        else setTimeOfDay('evening');
      }
      if (draft.latitude && draft.longitude) {
        setMapCoordinates({ lat: draft.latitude, lng: draft.longitude });
        setMarker({ lat: draft.latitude, lng: draft.longitude });
      }
    };
    fetchDraftAppointment();
  }, [user]);

  const checkIfInPerth = (address: string, lat: number, lng: number) => {
    // Perth metro area bounding box
    const north = -31.6;
    const south = -32.3;
    const east = 116.3;
    const west = 115.6;

    if (lat < north && lat > south && lng > west && lng < east) {
      setIsInPerth(true);
    } else {
      setIsInPerth(false);
    }
  };

  // Get user's current location on mount and reverse geocode to address
  useEffect(() => {
    if (navigator.geolocation && isLoaded) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setMarker({ lat: latitude, lng: longitude });
          setMapCoordinates({ lat: latitude, lng: longitude });

          // Reverse geocode to get address
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setAddress(results[0].formatted_address);
                checkIfInPerth(results[0].formatted_address, latitude, longitude);
              }
            });
          }
        },
        (error) => {
          // Optionally handle error (e.g., user denied)
          console.log("Geolocation error:", error);
        }
      );
    }
  }, [isLoaded]);

  // Reset time slot when time of day changes
  useEffect(() => {
    setSelectedTimeSlot(null)
  }, [timeOfDay])

  const handleNext = async () => {
    if (!draftId || !isFormValid) return;
    setError(null);
    const { error } = await supabase
      .from('appointments')
      .update({
        address,
        additional_info: additionalInfo,
        date: date?.toISOString(),
        time_slot: selectedTimeSlot,
        time_of_day: timeOfDay,
        latitude: marker.lat,
        longitude: marker.lng,
        is_in_perth: isInPerth
      })
      .eq('id', draftId);
    if (error) {
      setError('Error updating draft appointment. Please try again.');
      return;
    }
    router.push("/book/payment");
  };

  const isFormValid = address && date && timeOfDay && selectedTimeSlot

  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place.geometry?.location) {
      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      setMarker({ lat, lng });
      setAddress(place.formatted_address || '');
      setMapCoordinates({ lat, lng });
      checkIfInPerth(place.formatted_address || '', lat, lng);
    }
  };

  const handleCancelBooking = async () => {
    if (!draftId) return;
    if (!window.confirm('Are you sure you want to cancel this booking? This cannot be undone.')) return;
    setIsCancelling(true);
    await supabase.from('appointments').delete().eq('id', draftId);
    setIsCancelling(false);
    router.replace('/portal/bookings');
  };

  console.log({
    address,
    date,
    timeOfDay,
    selectedTimeSlot,
    isFormValid,
    isInPerth
  });

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
              {isLoaded ? (
                <>
                  <Autocomplete
                    onLoad={ref => {
                      if (ref) {
                        autocompleteRef.current = ref;
                      }
                    }}
                    onPlaceChanged={handlePlaceChanged}
                    options={{
                      componentRestrictions: { country: 'au' },
                      bounds: {
                        north: -31.7, // North of Perth
                        south: -32.3, // South of Perth
                        east: 116.1,  // East of Perth
                        west: 115.6   // West of Perth
                      },
                      strictBounds: true
                    }}
                  >
                    <div className="relative mb-4">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <MapPin className="w-5 h-5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter your address"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-base"
                        value={address}
                        onChange={async e => {
                          const newAddress = e.target.value;
                          setAddress(newAddress);
                          if (window.google && window.google.maps) {
                            const geocoder = new window.google.maps.Geocoder();
                            geocoder.geocode({ address: newAddress }, (results, status) => {
                              if (status === 'OK' && results && results[0]) {
                                const loc = results[0].geometry.location;
                                const lat = loc.lat();
                                const lng = loc.lng();
                                setMarker({ lat, lng });
                                setMapCoordinates({ lat, lng });
                                checkIfInPerth(newAddress, lat, lng);
                              } else {
                                setIsInPerth(false);
                              }
                            });
                          } else {
                            setIsInPerth(false);
                          }
                        }}
                      />
                    </div>
                  </Autocomplete>
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={marker}
                    zoom={14}
                    onClick={e => {
                      if (!e.latLng) return;
                      setMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    }}
                  >
                    <Marker
                      position={marker}
                      draggable
                      onDragEnd={e => {
                        if (!e.latLng) return;
                        setMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                      }}
                    />
                  </GoogleMap>
                  <div style={{ height: 24 }} />
                </>
              ) : (
                <div>Loading map...</div>
              )}

              <Label htmlFor="additional-info" className="text-base font-medium mb-2 block">
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
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !date && "text-gray-400")}
                      >
                        {date ? format(date, "PPP") : "Select a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(date) => {
                          // Disable dates in the past
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
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
                    <div className="flex items-center space-x-2 bg-white border rounded-md px-3 py-2 cursor-pointer hover:border-teal-200">
                      <RadioGroupItem value="morning" id="morning" />
                      <Label htmlFor="morning" className="cursor-pointer">
                        Morning
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white border rounded-md px-3 py-2 cursor-pointer hover:border-teal-200">
                      <RadioGroupItem value="afternoon" id="afternoon" />
                      <Label htmlFor="afternoon" className="cursor-pointer">
                        Afternoon
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white border rounded-md px-3 py-2 cursor-pointer hover:border-teal-200">
                      <RadioGroupItem value="evening" id="evening" />
                      <Label htmlFor="evening" className="cursor-pointer">
                        Evening
                      </Label>
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
                        className={cn(
                          "justify-center",
                          selectedTimeSlot === slot ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200",
                        )}
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
              disabled={!isFormValid || !isInPerth}
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              Review details
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
