import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { SmartLogo } from "@/components/smart-logo"

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      {/* Header section */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <SmartLogo />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/services" className="text-base font-medium text-gray-900">
              Services
            </Link>
            <Link href="#" className="text-base font-medium text-gray-700">
              Locations
            </Link>
            <Link href="/portal/bookings" className="text-base font-medium text-gray-700">
              Book appointment
            </Link>
            <Link href="#" className="text-base font-medium text-gray-700">
              Become a provider
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-base font-medium text-gray-700">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-[#4e968f] hover:bg-[#43847e]">
                Sign up
              </Button>
            </Link>
          </div>
          <button className="md:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {/* Hero section */}
        <section className="py-16 text-center px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Vet services at your doorstep</h1>
          <p className="mt-4 max-w-2xl mx-auto text-gray-600">
            Keep your pet protected with routine vaccinations, essential for preventing common diseases and ensuring
            their long-term health and safety.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link href="/portal/bookings">
              <Button className="bg-[#4e968f] hover:bg-[#43847e]">Schedule a visit</Button>
            </Link>
          </div>
        </section>

        {/* Services intro section */}
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Explore what we are offering</h2>
            <p className="mt-4 text-gray-600">
              From routine checkups to specialized care, our veterinary services are here to support every stage of your
              pet's health. Discover tailored care ready to provide compassionate, expert care for your beloved
              companion.
            </p>
          </div>
        </section>

        {/* After Hours Home Visit */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">After Hours Home Visit</h2>
                <p className="mb-3 text-gray-700">
                  A MobiPet home visit provides expert veterinary care at your doorstep, whether it's addressing a mild
                  concern or monitoring ongoing treatment. Should your pet have a non-life threatening emergency or is
                  suffering from a mobility issue or stress when visiting the vet, we're here to help with compassionate
                  care provided in the comfort of your home.
                </p>
                <p className="mb-3 text-gray-700">
                  This service is ideal for pets that are stressed by travel, elderly pets, or those in need of hospice
                  care. Our gentle care helps to ensure a calm, stress-free examination and treatment.
                </p>
                <p className="mb-3 text-gray-700">
                  When appropriate and the current issue is manageable, our vet-to-mobile visit packages may care for
                  the regular vet clinic. We provide prescriptions when necessary and maintain detailed records for each
                  pet visit to track medical history or communication between our mobile unit and your regular
                  veterinary clinic.
                </p>
                <p className="mb-3 text-gray-700">
                  If we encounter a more serious illness or condition that requires specialized care or advanced
                  treatment, we will refer and will collaborate with your emergency clinic on your pet's behalf to
                  ensure a consistent pet health evaluation and treatment.
                </p>
                <div className="mt-6">
                  <p className="text-lg font-semibold text-gray-900">$99</p>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden">
                <Image
                  src="/vet-with-dog.jpg"
                  alt="Veterinarian examining a dog"
                  width={500}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* At-Home Peaceful Euthanasia */}
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1 rounded-lg overflow-hidden">
                <Image
                  src="/cat-euthanasia.jpg"
                  alt="At-home pet euthanasia service"
                  width={500}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">At-Home Peaceful Euthanasia</h2>
                <p className="mb-3 text-gray-700">
                  MobiPet mobile veterinary service offers compassionate at-home euthanasia, allowing your beloved pet
                  to peacefully pass away in the comfort of your home, surrounded by family. Our experienced vets
                  provide a calm, stress-free environment for both you and your pet during this difficult time. Our
                  experienced veterinarians are dedicated to ensuring your pet's final moments are peaceful and
                  dignified, guiding you through each step with care and understanding. We prioritize your pet's comfort
                  and dignity, ensuring their final moments are calm and comfortable as they are surrounded by their
                  family.
                </p>
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Cat Or Small Dog (&lt;15kg)</p>
                    <p className="text-gray-900 font-semibold">$449</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Medium Dog (15-30kg)</p>
                    <p className="text-gray-900 font-semibold">$499</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Large Dog (31-50kg)</p>
                    <p className="text-gray-900 font-semibold">$599</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">XLarge Dog (51kg+)</p>
                    <p className="text-gray-900 font-semibold">$649</p>
                  </div>
                  <div className="mt-4 pt-2 border-t">
                    <p className="text-gray-700 font-medium">Handling Fee for Aftercare (Cremation Services):</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-gray-700">+20kg</p>
                        <p className="text-gray-900 font-semibold">$49</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-700">+40kg</p>
                        <p className="text-gray-900 font-semibold">$99</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
            <p className="text-center mb-10 text-gray-700">Connecting you with local vets in a few simple steps:</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4e968f] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-semibold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Request appointment</h3>
                <p className="text-sm text-gray-600">
                  Choose your service, tell us what's going on with your pet, and pick a convenient date and time. Your
                  appointment details will then be connected to local vets in your area.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4e968f] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-semibold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Confirm appointment</h3>
                <p className="text-sm text-gray-600">
                  A vet will confirm your appointment or suggest an alternative time you will have the option to
                  confirm, or wait for another vet to respond.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4e968f] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-semibold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get notified</h3>
                <p className="text-sm text-gray-600">
                  Get notifications when a vet is on the way. Your vet will also notify you with up to date arrival
                  times.
                </p>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4e968f] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-semibold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Enjoy hassle free vet care</h3>
                <p className="text-sm text-gray-600">
                  The vet arrives and takes care of your pet! After the visit, a summary will be sent to you and your
                  record will be finalized.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-700 mb-2">
                MobiPet also allows you to track and manage appointments, and your pets records, all in one place.
              </p>

              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-sm font-medium text-gray-700">Important notice</p>
                <p className="text-sm text-gray-600 mt-1">
                  If your pet appears to be in a life threatening situation go to your local emergency vet clinic
                  immediately. Our home fee is a flat fee.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Frequently asked questions</h2>
            <p className="text-center mb-10 text-gray-700">Everything you need to know about MobiPet</p>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">What is MobiPet?</AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  MobiPet is a mobile veterinary service that brings quality pet care to your doorstep. Our licensed
                  veterinarians provide a range of services including routine check-ups, vaccinations, sick visits, and
                  end-of-life care, all in the comfort of your home.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  How do I book a service through MobiPet?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Booking a service with MobiPet is simple. Just select the service you need, enter your location and
                  preferred time, provide details about your pet, and confirm the appointment. One of our veterinarians
                  will then be assigned to your booking.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  What types of services can I book?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  We offer a wide range of services including wellness exams, vaccinations, sick pet visits, geriatric
                  care, euthanasia, and more. Our goal is to provide comprehensive veterinary care without the stress of
                  transporting your pet to a clinic.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">How much do services cost?</AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Our service fees vary depending on the type of service, pet size, and location. Base visit fees start
                  at $99, with additional costs for specific treatments, medications, or services. You'll see a
                  transparent breakdown of costs before confirming your appointment.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  Are there any extra charges for emergency or after-hours appointments?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Yes, emergency and after-hours appointments may incur additional fees. These will be clearly
                  communicated to you during the booking process. For life-threatening emergencies, we recommend going
                  directly to an emergency animal hospital.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  What payment methods do you accept?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  We accept all major credit cards, digital wallets, and some pet insurance plans. Payment is processed
                  securely through our platform after your appointment is completed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  Can I cancel or reschedule my appointment?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Yes, you can cancel or reschedule through your MobiPet account up to 24 hours before the appointment
                  without incurring a fee. Cancellations made less than 24 hours in advance may be subject to a
                  cancellation fee.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  What should I do if my pet has an emergency?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  For immediate life-threatening emergencies, please go directly to your nearest emergency vet clinic.
                  MobiPet is not designed to replace emergency services. If you're unsure if your situation is an
                  emergency, you can contact us, and we'll advise you on the best course of action.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  Do I need to be present during the service?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Yes, an adult pet owner or authorized caretaker must be present during the entire visit. This ensures
                  that you can provide necessary information, assist with handling your pet if needed, and receive
                  detailed feedback from the veterinarian.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  How can I prepare my pet for the appointment?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Keep your pet in a comfortable, quiet area before the appointment. Have any previous medical records
                  ready, prepare a list of questions or concerns, and make sure your pet is accessible (not hiding). For
                  cats, a small, enclosed space like a bathroom works well for examinations.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  Can I leave a review for my provider?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Yes, and we encourage it! After your appointment, you'll receive a link to leave feedback about your
                  experience. Your reviews help us maintain high-quality care and assist other pet owners in choosing
                  the right provider.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-12" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  Is my payment information secure?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  Absolutely. We use industry-standard encryption and secure payment processing systems to ensure your
                  financial information is protected. We comply with all relevant data protection regulations and never
                  store your complete payment details on our servers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-13" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  What locations does MobiPet serve?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  MobiPet currently serves major metropolitan areas and surrounding suburbs. Enter your address during
                  the booking process to check if we service your area. We're continuously expanding our coverage, so
                  check back if we're not yet in your neighborhood.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-14" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  How are providers selected for the MobiPet platform?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  All MobiPet veterinarians undergo rigorous vetting, including license verification, background checks,
                  and professional reference reviews. We only partner with licensed veterinarians who have significant
                  experience and share our commitment to compassionate pet care.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-15" className="bg-white rounded-lg border p-2">
                <AccordionTrigger className="px-4 hover:no-underline">
                  How can I contact MobiPet customer support?
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-gray-700">
                  You can reach our customer support team through the "Help" section in your MobiPet account, by email
                  at support@mobipet.com, or by phone during business hours. We aim to respond to all inquiries within
                  24 hours.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex justify-center">
              <div className="flex -space-x-4">
                <Image
                  src="/professional-headshot.png"
                  alt="Veterinarian"
                  width={60}
                  height={60}
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
                <Image
                  src="/professional-woman-diverse.png"
                  alt="Veterinarian"
                  width={60}
                  height={60}
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
                <Image
                  src="/professional-man.png"
                  alt="Veterinarian"
                  width={60}
                  height={60}
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Find Trusted Pet Care, Anytime, Anywhere</h2>
            <p className="text-gray-700 mb-8">
              Can't find the answer you're looking for? Please chat to our friendly team.
            </p>
            <Link href="/portal/bookings">
              <Button size="lg" className="bg-[#4e968f] hover:bg-[#43847e]">
                Book services
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center md:justify-between items-center">
            <Link href="/" className="flex items-center">
              <SmartLogo />
            </Link>
            <p className="text-sm text-gray-500 hidden md:block">© 2024 MobiPet. All rights reserved.</p>
          </div>
          <p className="text-sm text-gray-500 text-center mt-4 md:hidden">© 2024 MobiPet. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
