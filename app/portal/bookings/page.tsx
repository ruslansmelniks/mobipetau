"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, AlertCircle, ChevronRight, Search, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { Appointment, UserData } from "@/types" // Import the types we created

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const user = useUser() as UserData | null
  const supabase = useSupabaseClient() // Use the hook instead of creating a manual client
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true)
      if (!user) {
        setAppointments([])
        setLoading(false)
        return
      }

      console.log("Fetching appointments for user:", user.id);
      
      try {
        // Use explicit join syntax for better reliability
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            pets:pet_id (
              id, 
              name, 
              image, 
              type
            )
          `)
          .eq("pet_owner_id", user.id)
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Error fetching appointments:", error);
          setAppointments([]);
        } else {
          console.log("Fetched appointments:", data);
          setAppointments(data || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAppointments();
  }, [user, supabase]);

  useEffect(() => {
    if (appointments.length > 0) {
      console.log("Example appointment data:", appointments[0]);
      if (appointments[0].pets) {
        console.log("Pet data:", appointments[0].pets);
      } else {
        console.log("No pet data found in appointment");
      }
    }
  }, [appointments]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", color: "bg-blue-100 text-blue-800" }
      case "confirmed":
        return { label: "Confirmed", color: "bg-green-100 text-green-800" }
      case "pending_vet":
        return { label: "Waiting for vet", color: "bg-yellow-100 text-yellow-800" }
      case "rescheduled":
        return { label: "Rescheduled", color: "bg-blue-100 text-blue-800" }
      case "completed":
        return { label: "Completed", color: "bg-gray-100 text-gray-800" }
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-800" }
      default:
        return { label: status || "Unknown", color: "bg-gray-100 text-gray-800" }
    }
  }

  const filteredAppointments = appointments.filter(
    (appointment) =>
      (appointment.pets?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.status || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.id + "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === "pending" || 
                     appointment.status === "confirmed" || 
                     appointment.status === "pending_vet" || 
                     appointment.status === "rescheduled"
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

  // Helper function to parse and format services
  const formatServices = (servicesData: any) => {
    if (!servicesData) return [];
    try {
      const services = typeof servicesData === 'string' 
        ? JSON.parse(servicesData) 
        : servicesData;
      return Array.isArray(services) ? services : [];
    } catch (e) {
      console.error('Error parsing services:', e);
      return [];
    }
  };

  // Helper function to render service tags with unique keys
  const renderServiceTags = (services: any, appointmentId: string) => {
    if (!services) return null;
    try {
      const serviceIds = typeof services === 'string' 
        ? JSON.parse(services) 
        : services;
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return null;
      }
      const serviceMap = {
        '1': 'After hours home visit',
        '2': 'At-Home Peaceful Euthanasia',
      };
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {serviceIds.map((serviceId: string, index: number) => {
            const label = (serviceId === '1' || serviceId === '2') ? serviceMap[serviceId] : `Service ${serviceId}`;
            return (
              <span 
                key={`service-${appointmentId}-${serviceId}-${index}`} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
              >
                {label}
              </span>
            );
          })}
        </div>
      );
    } catch (e) {
      console.error('Error rendering services:', e);
      return null;
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const statusInfo = getStatusLabel(appointment.status);
    const petName = appointment.pets?.name || "Unknown Pet";
    const petType = appointment.pets?.type || "Pet";
    const petImage = appointment.pets?.image || null;

    const appointmentDate = appointment.date ? new Date(appointment.date).toLocaleDateString() : "Date not specified";
    const appointmentTime = appointment.time_slot || "Time not specified";
    const paymentAmount = appointment.total_price ? `$${appointment.total_price}` : "N/A";

    return (
      <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
        {/* Appointment Header */}
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                {petImage ? (
                  <Image
                    src={petImage}
                    alt={petName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span>No img</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{petName}</h2>
                <p className="text-gray-600">{petType || "Pet"}</p>
                {/* Service tags */}
                {appointment.services && renderServiceTags(appointment.services, appointment.id)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
              <button 
                onClick={() => {
                  if (appointment && appointment.id) { // Ensure appointment and id exist
                    navigator.clipboard.writeText(appointment.id);
                    setCopiedId(appointment.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Copy Appointment ID"
              >
                {copiedId === appointment.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <span className="text-gray-500 text-sm">#{appointment.id.substring(0, 8)}</span>
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
                <p className="text-gray-600">{appointmentDate}</p>
              </div>
            </div>
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-gray-600">{appointmentTime}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-gray-600">{appointment.address || "Address not specified"}</p>
                {appointment.notes && <p className="text-gray-600 text-sm">{appointment.notes}</p>}
              </div>

            </div>
            <div className="flex items-start">
              <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0">$</div>
              <div>
                <p className="font-medium">Payment</p>
                <p className="text-gray-600">Status: {appointment.payment_status || "N/A"}</p>
                <p className="text-gray-600">Amount: {paymentAmount}</p>
                <p className="text-gray-600">Method: {appointment.payment_method || "N/A"}</p>
                {appointment.payment_id && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 font-medium mb-1">Transaction ID:</p>
                    <div className="bg-gray-100 p-2 rounded-md overflow-hidden flex items-center">
                      <code className="text-xs text-gray-600 font-mono overflow-hidden truncate mr-2 flex-1">
                        {appointment.payment_id}
                      </code>
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(appointment.payment_id);
                          setCopiedId(appointment.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        title="Copy transaction ID"
                      >
                        {copiedId === appointment.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vet Proposal */}
        {appointment.status === 'pending_vet' && appointment.proposed_time && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="font-medium text-yellow-800">Vet proposed new time: {new Date(appointment.proposed_time).toLocaleString()}</p>
            <div className="mt-2 space-x-2">
                <Button size="sm" onClick={() => acceptProposal(appointment.id)} className="bg-green-500 hover:bg-green-600">Accept</Button>
                <Button size="sm" variant="outline" onClick={() => declineProposal(appointment.id)}>Decline</Button>
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
                <>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      if (!user) return;
                      if (window.confirm("Are you sure you want to cancel this appointment? This cannot be undone.")) {
                        try {
                          setLoading(true);
                          const { error } = await supabase
                            .from('appointments')
                            .update({ status: 'cancelled' })
                            .eq('id', appointment.id);
                          if (error) {
                            console.error("Error cancelling appointment:", error);
                            alert("Failed to cancel appointment. Please try again.");
                          } else {
                            // Refresh appointments after cancellation with explicit join
                            if (!user) return;
                            const { data, error: fetchError } = await supabase
                              .from("appointments")
                              .select(`
                                *,
                                pets:pet_id (
                                  id, 
                                  name, 
                                  image, 
                                  type
                                )
                              `)
                              .eq("pet_owner_id", user.id)
                              .order("created_at", { ascending: false });
                            if (fetchError) {
                              console.error("Error refreshing appointments:", fetchError);
                            } else {
                              setAppointments(data || []);
                            }
                          }
                        } catch (err) {
                          console.error("Error in cancellation:", err);
                          alert("An unexpected error occurred. Please try again.");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  >
                    Yes, cancel it
                  </Button>
                </>
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