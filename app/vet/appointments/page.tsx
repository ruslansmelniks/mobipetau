"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, Search, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { toast } from "@/components/ui/use-toast"

export default function VetAppointmentsPage() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [proposedTime, setProposedTime] = useState("")

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Get the session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        // Use the API endpoint to fetch appointments
        const response = await fetch('/api/vet/appointments', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch appointments');
        }

        const data = await response.json();
        setAppointments(data.appointments || []);
      } catch (error: any) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load appointments",
          variant: "destructive",
        });
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [user, supabase]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_approval":
      case "waiting_for_vet":
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
      appointment.pets?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.pet_owner?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.pet_owner?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingAppointments = filteredAppointments.filter((appointment) => 
    appointment.status === "pending_approval" || appointment.status === "waiting_for_vet"
  )
  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "confirmed" && appointment.date && new Date(appointment.date) >= new Date()
  )
  const pastAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "completed" || appointment.status === "cancelled"
  )

  const renderAppointmentCard = (appointment: any) => {
    const statusInfo = getStatusLabel(appointment.status);
    const isPending = appointment.status === "pending_approval" || appointment.status === "waiting_for_vet";

    return (
      <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {appointment.pets?.name || 'Unknown Pet'}
              </h3>
              <p className="text-gray-600">
                {appointment.pet_owner?.first_name} {appointment.pet_owner?.last_name}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {isPending ? "Requested Date" : "Appointment Date"}
                  </p>
                  <p className="text-gray-600">
                    {appointment.date ? new Date(appointment.date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {isPending ? "Requested Time" : "Appointment Time"}
                  </p>
                  <p className="text-gray-600">
                    {appointment.time_slot || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-gray-600">{appointment.address || 'Not provided'}</p>
                </div>
              </div>
              {appointment.additional_info && (
                <div className="flex items-start">
                  <div>
                    <p className="font-medium">Additional Info</p>
                    <p className="text-gray-600">{appointment.additional_info}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t mt-6 -mx-6 -mb-6">
            <div className="flex flex-wrap justify-between gap-4">
              <Button variant="outline" asChild>
                <Link href={`/vet/messages?appointment=${appointment.id}`}>
                  <span className="flex items-center">Message pet owner</span>
                </Link>
              </Button>
              <div className="flex flex-wrap gap-3">
                {appointment.status === "confirmed" && (
                  <Button 
                    className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                    asChild
                  >
                    <Link href={`/vet/appointments/${appointment.id}`}>
                      View Details
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
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
