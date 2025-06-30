"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Clock, Calendar, MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartLogo } from "@/components/smart-logo"

// Mock appointment data - in a real app, this would come from your backend
const appointment = {
  id: "APT-25061001",
  status: "pending_vet", // pending_vet, confirmed, rescheduled, completed, cancelled
  pet: {
    name: "Twinnie",
    type: "Gray rabbit",
    image: "/placeholder.svg?key=7jhda",
  },
  service: {
    title: "After hours home visit",
    price: 299,
  },
  date: "Tuesday, June 10, 2025",
  time: "06:00 - 08:00 AM",
  address: "123 Example Street, Perth WA 6000",
  additionalInfo: "Gate code: 1234",
  vetProposal: {
    hasProposal: true,
    proposedDate: "Tuesday, June 10, 2025",
    proposedTime: "08:00 - 10:00 AM",
    message: "I'm available a bit later in the morning. Would this time work for you?",
  },
}

export default function Dashboard() {
  const [showProposal, setShowProposal] = useState(true)

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_vet":
        return { label: "Waiting for vet", color: "bg-yellow-100 text-yellow-800" }
      case "confirmed":
        return { label: "Confirmed", color: "bg-green-100 text-green-800" }
      case "rescheduled":
        return { label: "Rescheduled", color: "bg-blue-100 text-blue-800" }
      case "completed":
        return { label: "Completed", color: "bg-gray-100 text-gray-800" }
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-800" }
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800" }
    }
  }

  const status = getStatusLabel(appointment.status)

  const acceptProposal = () => {
    // In a real app, this would call an API to accept the proposal
    alert("In a real app, this would accept the vet's proposed time.")
    setShowProposal(false)
  }

  const declineProposal = () => {
    // In a real app, this would call an API to decline the proposal
    alert("In a real app, this would decline the vet's proposed time.")
    setShowProposal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <SmartLogo />
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-sm font-medium text-teal-600">
                Dashboard
              </Link>
              <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-teal-600">
                Profile
              </Link>
              <Link href="/pets" className="text-sm font-medium text-gray-700 hover:text-teal-600">
                My Pets
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#fcfcfd] border-[#d0d5dd] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] hover:bg-gray-50"
              >
                Log out
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-[1400px] px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Appointments</h1>

          {/* Appointment Card */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-8">
            {/* Appointment Header */}
            <div className="p-6 border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={appointment.pet.image || "/placeholder.svg"}
                      alt={appointment.pet.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{appointment.service.title}</h2>
                    <p className="text-gray-600">
                      For {appointment.pet.name} ({appointment.pet.type})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                  <span className="text-gray-500 text-sm">#{appointment.id}</span>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-gray-600">{appointment.date}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-gray-600">{appointment.time}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">{appointment.address}</p>
                    {appointment.additionalInfo && (
                      <p className="text-gray-600 text-sm">{appointment.additionalInfo}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0">$</div>
                  <div>
                    <p className="font-medium">Estimated Price</p>
                    <p className="text-gray-600">${appointment.service.price}</p>
                    <p className="text-gray-500 text-xs mt-1">Final price may vary based on services provided</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vet Proposal */}
            {appointment.vetProposal.hasProposal && showProposal && (
              <div className="p-6 bg-yellow-50 border-t border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">Vet has proposed a new time</p>
                    <p className="text-yellow-700 mb-3">{appointment.vetProposal.message}</p>
                    <div className="bg-white p-3 rounded-md border border-yellow-200 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-yellow-600 mr-2" />
                          <span className="text-sm">{appointment.vetProposal.proposedDate}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                          <span className="text-sm">{appointment.vetProposal.proposedTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={acceptProposal}
                        className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                      >
                        Accept new time
                      </Button>
                      <Button variant="outline" onClick={declineProposal}>
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t">
              <div className="flex flex-wrap justify-between gap-4">
                <Button variant="outline" asChild>
                  <Link href="/portal/bookings">Book another appointment</Link>
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Cancel appointment
                  </Button>
                  <Button className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]">
                    Contact support
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* No Appointments State (hidden for now) */}
          <div className="hidden bg-white rounded-lg border shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No appointments yet</h2>
            <p className="text-gray-600 mb-6">You don't have any upcoming or past appointments.</p>
            <Button
              className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
              asChild
            >
              <Link href="/portal/bookings">Book an appointment</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
