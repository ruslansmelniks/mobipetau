"use client"

import { useState } from "react"
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SmartLogo } from "@/components/smart-logo"
import { MobileMenu } from "@/components/mobile-menu"
import { ProviderWaitlistDialog } from "@/components/provider-waitlist-dialog"
import Link from "next/link"
import { Loader } from "@/components/ui/loader"
import { useUser } from "@/hooks/useSupabase"

// Perth center coordinates
const perthCenter = { lat: -31.9505, lng: 115.8605 }

// Loading component for map
const MapLoading = () => (
  <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg">
    <Loader size="lg" />
    <span className="ml-2 text-gray-600">Loading map...</span>
  </div>
)

export default function LocationsPage() {
  const [isWaitlistDialogOpen, setIsWaitlistDialogOpen] = useState(false)
  const { user } = useUser()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  })

  const navLinks = [
    { href: "/services", label: "Services" },
    { href: "/locations", label: "Locations" },
    { href: user ? "/portal/bookings" : "/login", label: "Book appointment" },
  ]

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Failed to load map</h1>
          <p className="text-gray-600">Please try refreshing the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <SmartLogo />
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-700 hover:text-teal-600">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={() => setIsWaitlistDialogOpen(true)}
            className="text-sm font-medium text-gray-700 hover:text-teal-600"
          >
            Become a provider
          </button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#fcfcfd] border-[#d0d5dd] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] hover:bg-gray-50"
            asChild
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            asChild
          >
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
        <MobileMenu links={navLinks} onOpenWaitlistDialog={() => setIsWaitlistDialogOpen(true)} />
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-16 bg-white">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                MobiPet services in Perth, WA
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We are currently only servicing the Perth metro area (see locations below) however will be expanding our suburbs served in the near future.
              </p>
            </div>
          </div>
          {/* Map Section - now full width */}
          <div className="w-full">
            {!isLoaded ? (
              <MapLoading />
            ) : (
              <div className="h-[400px] w-full">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={perthCenter}
                  zoom={10}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    scrollwheel: true,
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pt-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <h2 className="text-center text-3xl font-bold mb-12">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="item-1" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    What is MobiPet?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    MobiPet is a mobile veterinary service that connects pet owners with qualified veterinarians who
                    provide care at your home, especially during after-hours and weekends when regular vet clinics may
                    be closed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    How do I book a service through MobiPet?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    You can book a service through our website or mobile app by creating an account, providing
                    information about your pet and the issue, and selecting your preferred appointment time.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    What types of services can I book?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    MobiPet offers a range of services including urgent care visits, wellness exams, vaccinations,
                    at-home euthanasia, and more. All services are provided in the comfort of your home.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    How much do services cost?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Service costs vary depending on the type of care needed. You'll receive a price estimate before
                    confirming your appointment, and a detailed invoice after the visit.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    Are there any extra charges for emergency or after-hours appointments?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    After-hours and emergency appointments may have additional fees. These will be clearly communicated
                    before you confirm your booking.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    What payment methods do you accept?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    We accept all major credit cards, digital wallets, and some insurance plans. Payment is processed
                    securely through our platform after your appointment.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-7" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    Can I cancel or reschedule my appointment?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Yes, you can cancel or reschedule through your MobiPet account. Please note that cancellations
                    within 2 hours of the appointment may incur a fee.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    What should I do if my pet has an emergency?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    For life-threatening emergencies, please go to your nearest emergency vet clinic immediately. For
                    urgent but non-life-threatening situations, you can book an urgent care visit through MobiPet.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-9" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    Do I need to be present during the service?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Yes, an adult must be present during the entire veterinary visit to provide information about the
                    pet and consent for treatments.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-10" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    How can I prepare for the appointment?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Have your pet's medical history ready, secure your pet in a comfortable space, and ensure there's
                    adequate lighting and a clean area for the vet to work.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-11" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    Can I leave a review for my provider?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Yes, after your appointment, you'll receive a request to rate and review your experience. Your
                    feedback helps us maintain high-quality care.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-12" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    Is my payment information secure?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    Yes, we use industry-standard encryption and security measures to protect your payment information.
                    We never store your complete card details on our servers.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-13" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    What locations does MobiPet serve?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    MobiPet currently serves the Perth metro area and surrounding suburbs. We are expanding our service
                    areas regularly. Check our locations page for the most up-to-date coverage areas.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-14" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    How are providers selected for the MobiPet platform?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    All veterinarians on our platform are licensed professionals who undergo thorough background checks,
                    credential verification, and training on our service standards.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-15" className="border rounded-lg px-4 overflow-hidden bg-white">
                  <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                    How can I contact MobiPet customer support?
                  </AccordionTrigger>
                  <AccordionContent className="transition-all duration-300 ease-in-out">
                    You can reach our customer support team through the help section in our app, by email at
                    support@mobipet.com, or by phone at +1 (555) 123-4567.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 text-center max-w-[1400px]">
            <h2 className="text-3xl font-bold mb-2">Ready to book your appointment?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Get professional veterinary care in the comfort of your home, available 24/7 for emergencies.
            </p>
            <Button
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
              size="lg"
              asChild
            >
              <Link href="/portal/bookings">Book service now</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <SmartLogo />
            </div>
            <div className="text-sm text-gray-500">© 2023 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
      <ProviderWaitlistDialog open={isWaitlistDialogOpen} onOpenChange={setIsWaitlistDialogOpen} />
    </div>
  )
} 