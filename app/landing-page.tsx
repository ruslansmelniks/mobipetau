"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TestimonialCarousel } from "@/components/testimonial-carousel"
import { MobileMenu } from "@/components/mobile-menu"
import { ProviderWaitlistDialog } from "@/components/provider-waitlist-dialog"
import { useUser } from "@/hooks/useSupabase"
import { useRouter } from "next/navigation"
import { SmartLogo } from "@/components/smart-logo"
import { redirectBasedOnRole } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, MapPin, Clock, DollarSign, Shield, Heart, Users, Award } from "lucide-react"

export default function LandingPage() {
  const [isWaitlistDialogOpen, setIsWaitlistDialogOpen] = useState(false)
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      // Try to get role from user_metadata first
      const role = user.user_metadata?.role;
      
      // If no role in metadata, check if we need to query the database
      if (role) {
        redirectBasedOnRole(role, router);
      } else {
        // If no role in metadata, we might need to fetch from DB
        // For now, default to pet owner portal
        router.push('/portal/bookings');
      }
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    const navLinks = [
      { href: "/services", label: "Services" },
      { href: "/locations", label: "Locations" },
      { href: "#book", label: "Book appointment" },
    ];
    const testimonials = [
      {
        id: 1,
        quote:
          '"MobiPet was a lifesaver when my dog got sick on a Sunday evening. The vet arrived within an hour and provided excellent care right in our living room."',
        author: "Jeremy Jones",
        image: "/professional-headshot.png",
      },
      {
        id: 2,
        quote:
          '"The convenience of having a vet come to our home made all the difference for our anxious cat. The service was professional, compassionate, and thorough."',
        author: "Caitlyn Clarke",
        image: "/professional-headshot.png",
      },
      {
        id: 3,
        quote:
          '"I was impressed by how quickly MobiPet connected me with a qualified vet. The entire experience was seamless, from booking to payment."',
        author: "Mac McLeod",
        image: "/professional-headshot.png",
      },
      {
        id: 4,
        quote:
          '"When our elderly dog needed end-of-life care, MobiPet provided the most compassionate service. Being able to say goodbye at home meant everything to us."',
        author: "Sarah Thompson",
        image: "/professional-headshot.png",
      },
      {
        id: 5,
        quote:
          '"As a busy parent, MobiPet has been a game-changer for our family\'s pet care needs. No more stressful trips to the clinic with kids and pets in tow!"',
        author: "Michael Rodriguez",
        image: "/professional-headshot.png",
      },
    ];
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
          <section className="relative flex justify-center">
            <div className="relative overflow-hidden rounded-[40px] mx-4 my-6 max-w-[1400px] w-full">
              <div className="absolute inset-0">
                <Image
                  src="/hero-woman-dog.jpg"
                  alt="Woman with a happy beagle dog"
                  width={1400}
                  height={600}
                  className="h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/50"></div>
              </div>
              <div className="relative flex flex-col items-center justify-center text-center px-4 py-20 text-white">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm mb-4">
                  Coming this June
                </span>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                  Vet care at your doorstep, when you need it most
                </h1>
                <p className="mt-6 max-w-2xl text-lg">
                  Our expert mobile vet provider offer hours and weekend vet care in the comfort of your home
                </p>
                <div className="mt-8 flex flex-col gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                    asChild
                  >
                    <Link href="/portal/bookings">Book online now</Link>
                  </Button>
                  <div className="flex items-center justify-center">
                    <span className="text-lg font-medium mr-2">+1 (555) 123-4567</span>
                    <span className="text-sm">• Schedule by phone</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="py-16 bg-white">
            <div className="container mx-auto px-4 max-w-[1400px]">
              <h3 className="text-center text-2xl font-bold mb-6">Comprehensive Vet care at your doorstep</h3>
              <p className="text-center max-w-3xl mx-auto text-gray-600 mb-12">
                MobiPet is here to make Mobile vet care convenient and accessible when your regular vet may not be
                available. We bring professional Mobile Vets, dedicated to your pet's health and happiness during
                difficult times, after hours or weekends.
              </p>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg border border-transparent">
                  <div className="w-16 h-16 flex items-center justify-center bg-teal-50 rounded-full mb-4">
                    <Image src="/icon-home-service.png" alt="After hours icon" width={40} height={40} />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">After hours home visit</h4>
                  <p className="text-center text-gray-600 text-sm">
                    A qualified vet will be promptly sent to urgently assist your pet in the event of an emergency.
                  </p>
                </div>
                <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg border border-transparent">
                  <div className="w-16 h-16 flex items-center justify-center bg-teal-50 rounded-full mb-4">
                    <Image src="/icon-euthanasia.png" alt="Euthanasia icon" width={40} height={40} />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">At-Home Peaceful Euthanasia</h4>
                  <p className="text-center text-gray-600 text-sm">
                    A compassionate, gentle approach to end-of-life comfort and handling of them, ensuring their final
                    moments are peaceful and surrounded by love.
                  </p>
                </div>
              </div>
              <div className="flex justify-center mt-8 gap-4">
                <Link href="/services" className="text-teal-600 hover:text-teal-700 font-medium">
                  Learn more
                </Link>
                <Button
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <Link href="/portal/bookings">Schedule a visit</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4 max-w-[1400px]">
              <h2 className="text-center text-3xl font-bold mb-2">How it works</h2>
              <p className="text-center mb-12">Connecting you with local vets in a few simple steps:</p>
              <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold mb-4">
                    1
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Request appointment</h4>
                  <p className="text-sm text-gray-600">
                    Create your profile, let us know what's wrong with your pet, and choose your preferred day and time.
                    Your request will then be circulated to local vets in your area.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold mb-4">
                    2
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Confirm appointment</h4>
                  <p className="text-sm text-gray-600">
                    A vet will contact you to suggest an appointment time. If they suggest a different time, you can use
                    the system to confirm, or wait until another vet responds.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold mb-4">
                    3
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Get notified</h4>
                  <p className="text-sm text-gray-600">
                    You will be notified when a vet is on their way to your home. You'll receive a notification as an
                    email or SMS message when they're close.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold mb-4">
                    4
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Enjoy hassle-free vet care</h4>
                  <p className="text-sm text-gray-600">
                    Our vets come with their own supplies and equipment. After your visit, you'll receive a report and
                    invoice. After your credit card payment will be finalized.
                  </p>
                </div>
              </div>
              <p className="text-center mt-10 text-gray-600">
                MobiPet also allows you to track and manage appointments, and your pets records, all in one place.
              </p>
              <div className="max-w-3xl mx-auto mt-8">
                <Alert className="bg-gray-50 border border-gray-200">
                  <Info className="h-4 w-4 text-teal-500" />
                  <AlertDescription className="text-sm text-gray-700">
                    <span className="font-semibold">Important notice:</span> If your pet appears to be in a
                    life-threatening situation go to your local emergency vet clinic immediately. Use MobiPet for a vet
                    visit.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </section>

          <section className="py-16 bg-white">
            <div className="container mx-auto px-4 max-w-[1400px]">
              <h2 className="text-center text-3xl font-bold mb-2">Frequently asked questions</h2>
              <p className="text-center mb-10 text-gray-600">Everything you need to know about MobiPet</p>
              <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="item-1" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What is MobiPet?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      MobiPet is a mobile veterinary service that connects pet owners with qualified veterinarians who
                      provide care at your home, especially during after-hours and weekends when regular vet clinics may
                      be closed.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      How do I book a service through MobiPet?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      You can book a service through our website or mobile app by creating an account, providing
                      information about your pet and the issue, and selecting your preferred appointment time.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What types of services can I book?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      MobiPet offers a range of services including urgent care visits, wellness exams, vaccinations,
                      at-home euthanasia, and more. All services are provided in the comfort of your home.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      How much do services cost?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Service costs vary depending on the type of care needed. You'll receive a price estimate before
                      confirming your appointment, and a detailed invoice after the visit.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      Are there any extra charges for emergency or after-hours appointments?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      After-hours and emergency appointments may have additional fees. These will be clearly communicated
                      before you confirm your booking.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-6" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What payment methods do you accept?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      We accept all major credit cards, digital wallets, and some insurance plans. Payment is processed
                      securely through our platform after your appointment.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-7" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What payment methods do you accept?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      We accept all major credit cards, digital wallets, and some insurance plans. Payment is processed
                      securely through our platform after your appointment.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-7" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      Can I cancel or reschedule my appointment?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Yes, you can cancel or reschedule through your MobiPet account. Please note that cancellations
                      within 2 hours of the appointment may incur a fee.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-8" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What should I do if my pet has an emergency?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      For life-threatening emergencies, please go to your nearest emergency vet clinic immediately. For
                      urgent but non-life-threatening situations, you can book an urgent care visit through MobiPet.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-9" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      Do I need to be present during the service?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Yes, an adult must be present during the entire veterinary visit to provide information about the
                      pet and consent for treatments.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-10" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      How can I prepare for the appointment?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Have your pet's medical history ready, secure your pet in a comfortable space, and ensure there's
                      adequate lighting and a clean area for the vet to work.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-11" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      Can I leave a review for my provider?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Yes, after your appointment, you'll receive a request to rate and review your experience. Your
                      feedback helps us maintain high-quality care.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-12" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      Is my payment information secure?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      Yes, we use industry-standard encryption and security measures to protect your payment information.
                      We never store your complete card details on our servers.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-13" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      What locations does MobiPet serve?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      MobiPet currently serves major metropolitan areas and surrounding suburbs. Enter your zip code on
                      our website to check if service is available in your area.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-14" className="border rounded-lg px-4 overflow-hidden">
                    <AccordionTrigger className="text-left font-medium transition-all hover:text-teal-600">
                      How are providers selected for the MobiPet platform?
                    </AccordionTrigger>
                    <AccordionContent className="transition-all duration-300 ease-in-out">
                      All veterinarians on our platform are licensed professionals who undergo thorough background checks,
                      credential verification, and training on our service standards.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-15" className="border rounded-lg px-4 overflow-hidden">
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

          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4 text-center max-w-[1400px]">
              <div className="mb-6">
                <Image src="/trusted-vets.png" alt="Trusted vets" width={240} height={80} className="mx-auto" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Find Trusted Pet Care, Anytime, Anywhere</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Can't find the answer you're looking for? Please chat to our friendly team.
              </p>
              <Button
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                asChild
              >
                <Link href="/portal/bookings">Book service</Link>
              </Button>
            </div>
          </section>

          <section className="py-16 bg-white">
            <div className="container mx-auto px-4 max-w-[1400px]">
              <h2 className="text-center text-3xl font-bold mb-2">What people say</h2>
              <p className="text-center mb-12 text-gray-600">See testimonials from our happy clients</p>
              <TestimonialCarousel testimonials={testimonials} />
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  )
} 