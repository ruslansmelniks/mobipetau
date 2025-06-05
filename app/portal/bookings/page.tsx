"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, XCircle, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface SimplifiedAppointment {
  id: string
  pet_owner_id: string
  pet_id?: string
  vet_id?: string
  status: string
  date?: string
  time_slot?: string
  address?: string
  notes?: string
  total_price?: number
  created_at: string
  updated_at?: string
}

interface Pet {
  id: string
  name: string
  type?: string
  breed?: string
  image?: string
}

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<SimplifiedAppointment[]>([])
  const [pets, setPets] = useState<Record<string, Pet>>({})
  const [loading, setLoading] = useState(true)
  const user = useUser()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    fetchAppointmentsSimplified()
  }, [user])

  const fetchAppointmentsSimplified = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token')
      }

      // Fetch appointments using the API endpoint
      const response = await fetch('/api/user/appointments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }

      const { appointments: appointmentsData, pets: petsData } = await response.json()

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        setPets({})
        return
      }

      setAppointments(appointmentsData)
      setPets(petsData)
    } catch (error) {
      console.error('Error in fetchAppointmentsSimplified:', error)
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      })
      setAppointments([])
      setPets({})
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptProposal = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/appointments/owner-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          action: 'accept_proposal'
        })
      })

      if (!response.ok) throw new Error('Failed to accept proposal')

      toast({
        title: "Success",
        description: "New appointment time accepted",
      })
      
      await fetchAppointmentsSimplified()
    } catch (error) {
      console.error('Error accepting proposal:', error)
      toast({
        title: "Error",
        description: "Failed to accept the proposed time",
        variant: "destructive",
      })
    }
  }

  const handleDeclineProposal = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/appointments/owner-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          action: 'decline_proposal'
        })
      })

      if (!response.ok) throw new Error('Failed to decline proposal')

      toast({
        title: "Success",
        description: "Appointment cancelled",
      })
      
      await fetchAppointmentsSimplified()
    } catch (error) {
      console.error('Error declining proposal:', error)
      toast({
        title: "Error",
        description: "Failed to decline the proposal",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting_for_vet":
        return <Badge className="bg-yellow-100 text-yellow-800">Waiting for Vet</Badge>
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case "time_proposed":
        return <Badge className="bg-blue-100 text-blue-800">New Time Proposed</Badge>
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
      case "cancelled":
      case "declined":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
          <p className="text-gray-600 mb-6">You haven't booked any appointments yet.</p>
          <Button asChild className="bg-[#4e968f] hover:bg-[#43847e]">
            <Link href="/book">Book Your First Appointment</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      
      <div className="space-y-6">
        {appointments.map((appointment) => {
          const pet = appointment.pet_id ? pets[appointment.pet_id] : null
          const isTimeProposed = appointment.status === 'time_proposed'
          
          return (
            <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {pet?.image ? (
                      <Image
                        src={pet.image}
                        alt={pet.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">
                          {pet?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {pet?.name || 'Unknown Pet'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {pet?.type} {pet?.breed && `• ${pet.breed}`}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {appointment.date 
                      ? format(new Date(appointment.date), 'EEEE, MMMM d, yyyy')
                      : 'Date not set'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {appointment.time_slot || 'Time not set'}
                  </div>
                  <div className="flex items-start text-gray-600 md:col-span-2">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                    <span>{appointment.address || 'Address not provided'}</span>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="bg-gray-50 p-3 rounded-md mb-4">
                    <p className="text-sm text-gray-700">{appointment.notes}</p>
                  </div>
                )}

                {isTimeProposed && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
                    <p className="font-medium text-blue-800 mb-2">
                      The vet has proposed a new time for your appointment
                    </p>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptProposal(appointment.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Accept New Time
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineProposal(appointment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Booking ID: {appointment.id}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/portal/messages?appointment=${appointment.id}`}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}