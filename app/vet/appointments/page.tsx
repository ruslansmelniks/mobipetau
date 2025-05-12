"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, Search, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Mock appointment data - in a real app, this would come from your backend
const appointments = [
  {
    id: "APT-25061001",
    status: "pending_approval", // pending_approval, confirmed, completed, cancelled
    pet: {
      name: "Twinnie",
      type: "Gray rabbit",
      image: "/placeholder.svg?key=7jhda",
      owner: "John Smith",
    },
    service: {
      title: "After hours home visit",
      price: 299,
    },
    requestedDate: "Tuesday, June 10, 2025",
    requestedTime: "06:00 - 08:00 AM",
    address: "123 Example Street, Perth WA 6000",
    additionalInfo: "Gate code: 1234",
    notes: "Pet hasn't been eating much for the past two days and seems lethargic.",
  },
  {
    id: "APT-25060502",
    status: "confirmed",
    pet: {
      name: "Max",
      type: "Golden Retriever",
      image: "/placeholder.svg?key=dog1",
      owner: "Sarah Johnson",
    },
    service: {
      title: "Regular checkup",
      price: 150,
    },
    requestedDate: "Thursday, June 5, 2025",
    requestedTime: "02:00 - 04:00 PM",
    confirmedDate: "Thursday, June 5, 2025",
    confirmedTime: "03:00 - 05:00 PM",
    address: "456 Main Street, Perth WA 6000",
    additionalInfo: "",
    notes: "Annual checkup and vaccinations.",
  },
  {
    id: "APT-25052201",
    status: "completed",
    pet: {
      name: "Whiskers",
      type: "Tabby Cat",
      image: "/tabby-cat-sunbeam.png",
      owner: "Michael Brown",
    },
    service: {
      title: "Vaccination",
      price: 120,
    },
    requestedDate: "Wednesday, May 22, 2025",
    requestedTime: "10:00 AM - 12:00 PM",
    confirmedDate: "Wednesday, May 22, 2025",
    confirmedTime: "11:00 AM - 01:00 PM",
    address: "789 Oak Avenue, Perth WA 6000",
    additionalInfo: "",
    notes: "Routine vaccinations and general health check.",
  },
]

export default function VetAppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [proposedTime, setProposedTime] = useState("")

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_approval":
        return { label: "Pending approval", color: "bg-yellow-100 text-yellow-800" }
      case "confirmed":
        return { label: "Confirmed", color: "bg-green-100 text-green-800" }
      case "completed":
        return { label: "Completed", color: "bg-gray-100 text-gray-800" }
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-800" }
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800" }
    }
  }

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.pet.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const pendingAppointments = filteredAppointments.filter((appointment) => appointment.status === "pending_approval")
  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "confirmed" && new Date(appointment.confirmedDate) >= new Date(),
  )
  const pastAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "completed" || appointment.status === "cancelled",
  )

  const acceptAppointment = (id: string) => {
    // In a real app, this would call an API to accept the appointment
    alert(`In a real app, this would accept appointment ${id}.`)
  }

  const proposeNewTime = (id: string) => {
    // In a real app, this would call an API to propose a new time
    alert(`In a real app, this would propose a new time for appointment ${id}: ${proposedTime}`)
    setProposedTime("")
  }

  const declineAppointment = (id: string) => {
    // In a real app, this would call an API to decline the appointment
    alert(`In a real app, this would decline appointment ${id}.`)
  }

  const renderAppointmentCard = (appointment: (typeof appointments)[0]) => {
    const status = getStatusLabel(appointment.status)

    return (
      <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
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
                  For {appointment.pet.name} ({appointment.pet.type}) • Owner: {appointment.pet.owner}
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
                <p className="font-medium">
                  {appointment.status === "pending_approval" ? "Requested Date" : "Appointment Date"}
                </p>
                <p className="text-gray-600">
                  {appointment.status === "pending_approval"
                    ? appointment.requestedDate
                    : appointment.confirmedDate || appointment.requestedDate}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {appointment.status === "pending_approval" ? "Requested Time" : "Appointment Time"}
                </p>
                <p className="text-gray-600">
                  {appointment.status === "pending_approval"
                    ? appointment.requestedTime
                    : appointment.confirmedTime || appointment.requestedTime}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-gray-600">{appointment.address}</p>
                {appointment.additionalInfo && <p className="text-gray-600 text-sm">{appointment.additionalInfo}</p>}
              </div>
            </div>
            <div className="flex items-start">
              <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0">$</div>
              <div>
                <p className="font-medium">Service Fee</p>
                <p className="text-gray-600">${appointment.service.price}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pet Notes */}
        {appointment.notes && (
          <div className="px-6 pb-6">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="font-medium mb-1">Notes</p>
              <p className="text-gray-600">{appointment.notes}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex flex-wrap justify-between gap-4">
            <Button variant="outline" asChild>
              <Link href={`/vet/messages?appointment=${appointment.id}`}>
                <span className="flex items-center">Message pet owner</span>
              </Link>
            </Button>
            <div className="flex flex-wrap gap-3">
              {appointment.status === "pending_approval" && (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => declineAppointment(appointment.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Propose time (e.g., 2-4 PM)"
                      className="w-40"
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => proposeNewTime(appointment.id)}
                      disabled={!proposedTime}
                    >
                      Propose Time
                    </Button>
                  </div>
                  <Button
                    className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                    onClick={() => acceptAppointment(appointment.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                </>
              )}
              {appointment.status === "confirmed" && (
                <Button className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]">
                  View Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search appointments"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="flex-1">
            Pending Approval
            {pendingAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                {pendingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming Appointments
            {upcomingAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                {upcomingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            Past Appointments
            {pastAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-100">
                {pastAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0">
          {pendingAppointments.length > 0 ? (
            pendingAppointments.map(renderAppointmentCard)
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No pending appointments</h2>
              <p className="text-gray-600 mb-6">You don't have any appointments waiting for approval.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointmentCard)
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No upcoming appointments</h2>
              <p className="text-gray-600 mb-6">You don't have any confirmed appointments scheduled.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          {pastAppointments.length > 0 ? (
            pastAppointments.map(renderAppointmentCard)
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No past appointments</h2>
              <p className="text-gray-600 mb-6">You don't have any completed or cancelled appointments.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
