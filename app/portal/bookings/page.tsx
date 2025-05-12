"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, AlertCircle, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const user = useUser()
  const supabase = useSupabaseClient()

  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true)
      if (!user) {
        setAppointments([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("appointments")
        .select("*, pets(name, image, type)")
        .eq("pet_owner_id", user.id)
        .order("created_at", { ascending: false })
      if (error) {
        console.error("Error fetching appointments:", error)
        setAppointments([])
      } else {
        setAppointments(data || [])
      }
      setLoading(false)
    }
    fetchAppointments()
  }, [user])

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

  const filteredAppointments = appointments.filter(
    (appointment) =>
      (appointment.pets?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.status || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.id + "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => appointment.status !== "completed" && appointment.status !== "cancelled"
  )

  const pastAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "completed" || appointment.status === "cancelled"
  )

  const acceptProposal = (id: string) => {
    // In a real app, this would call an API to accept the proposal
    alert(`In a real app, this would accept the vet's proposed time for appointment ${id}.`)
  }

  const declineProposal = (id: string) => {
    // In a real app, this would call an API to decline the proposal
    alert(`In a real app, this would decline the vet's proposed time for appointment ${id}.`)
  }

  const renderAppointmentCard = (appointment: any) => {
    const status = getStatusLabel(appointment.status)

    return (
      <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
        {/* Appointment Header */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={appointment.pets?.image || "/placeholder.svg"}
                  alt={appointment.pets?.name || "Pet"}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{appointment.service_title || "Appointment"}</h2>
                <p className="text-gray-600">
                  For {appointment.pets?.name} ({appointment.pets?.type})
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
                {appointment.notes && <p className="text-gray-600 text-sm">{appointment.notes}</p>}
              </div>
            </div>
            <div className="flex items-start">
              <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0">$</div>
              <div>
                <p className="font-medium">Payment</p>
                <p className="text-gray-600">Status: {appointment.payment_status || "N/A"}</p>
                <p className="text-gray-600">Amount: {appointment.payment_amount ? `$${appointment.payment_amount}` : "N/A"}</p>
                <p className="text-gray-600">Method: {appointment.payment_method || "N/A"}</p>
                {appointment.payment_id && (
                  <p className="text-gray-500 text-xs mt-1">Transaction ID: {appointment.payment_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vet Proposal */}
        {appointment.vetProposal?.hasProposal && (
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
                    onClick={() => acceptProposal(appointment.id)}
                    className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  >
                    Accept new time
                  </Button>
                  <Button variant="outline" onClick={() => declineProposal(appointment.id)}>
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
              <Link href={`/portal/messages?appointment=${appointment.id}`}>
                <span className="flex items-center">
                  Message vet <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              </Link>
            </Button>
            <div className="flex flex-wrap gap-3">
              {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  Cancel appointment
                </Button>
              )}
              <Button className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]">
                View details
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
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

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming Appointments
            {upcomingAppointments.length > 0 && (
              <span className="ml-2 bg-teal-100 text-teal-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {upcomingAppointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            Past Appointments
            {pastAppointments.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {pastAppointments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointmentCard)
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No upcoming appointments</h2>
              <p className="text-gray-600 mb-6">You don't have any upcoming appointments scheduled.</p>
              <Button
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                asChild
              >
                <Link href="/book">Book an appointment</Link>
              </Button>
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
              <p className="text-gray-600 mb-6">You don't have any past appointments.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
