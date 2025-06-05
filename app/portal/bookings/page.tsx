"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AppointmentNotifications } from "../../../components/appointment-notifications"
import { VetProfileModal } from "../../../components/vet-profile-modal"
import { UserCog, Mail, Phone } from "lucide-react"

interface Appointment {
  id: string
  status: string
  date: string
  time: string
  reason: string
  pets: {
    id: string
    name: string
    type: string
    breed: string
  }
  vet: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: string
    vet_profiles?: {
      specialties?: string[]
      bio?: string
      license_number?: string
      years_experience?: number
    }
  }
}

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showVetDetails, setShowVetDetails] = useState(false)
  const user = useUser()
  const supabase = useSupabaseClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    fetchAppointments()
  }, [user?.id, router])

  const fetchAppointments = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // First, fetch appointments with basic data
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (
            id,
            name,
            type,
            breed
          )
        `)
        .eq('pet_owner_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })

      if (appointmentsError) throw appointmentsError

      if (appointmentsData && appointmentsData.length > 0) {
        // Get unique vet IDs
        const vetIds = [...new Set(appointmentsData.map(apt => apt.vet_id).filter(Boolean))]
        
        // Fetch vet details separately
        if (vetIds.length > 0) {
          const { data: vetsData, error: vetsError } = await supabase
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              phone,
              role,
              vet_profiles (
                specialties,
                bio,
                license_number,
                years_experience
              )
            `)
            .in('id', vetIds)
            .eq('role', 'vet')
          
          if (vetsError) throw vetsError

          if (vetsData) {
            // Create a map of vet data
            const vetsMap = new Map(vetsData.map(vet => [vet.id, vet]))
            
            // Combine the data
            const enrichedAppointments = appointmentsData.map(appointment => ({
              ...appointment,
              vet: appointment.vet_id ? vetsMap.get(appointment.vet_id) : null
            }))

            setAppointments(enrichedAppointments)
          }
        } else {
          setAppointments(appointmentsData)
        }
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error

      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' }
            : apt
        )
      )

      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      })
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Bookings</h1>
      </div>

      <AppointmentNotifications />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{appointment.pets.name}</h3>
                <p className="text-sm text-gray-600">
                  {appointment.pets.breed} • {appointment.pets.type}
                </p>
              </div>

              {appointment.vet && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <UserCog className="mr-2 h-5 w-5" />
                    Veterinarian
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">Dr. {appointment.vet.first_name} {appointment.vet.last_name}</p>
                    {appointment.vet.email && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Mail className="inline h-4 w-4 mr-1" />
                        {appointment.vet.email}
                      </p>
                    )}
                    {appointment.vet.phone && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Phone className="inline h-4 w-4 mr-1" />
                        {appointment.vet.phone}
                      </p>
                    )}
                    {appointment.vet.vet_profiles?.bio && (
                      <p className="text-sm text-gray-600 mt-2">{appointment.vet.vet_profiles.bio}</p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setSelectedAppointment(appointment)
                        setShowVetDetails(true)
                      }}
                    >
                      View Full Profile
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Appointment Details</h3>
                <div className="space-y-2">
                  <p><strong>Date:</strong> {appointment.date}</p>
                  <p><strong>Time:</strong> {appointment.time}</p>
                  <p><strong>Reason:</strong> {appointment.reason}</p>
                  <p><strong>Status:</strong> {appointment.status}</p>
                </div>
              </div>

              {appointment.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  onClick={() => handleCancelAppointment(appointment.id)}
                >
                  Cancel Appointment
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedAppointment?.vet && (
        <VetProfileModal
          vet={selectedAppointment.vet}
          isOpen={showVetDetails}
          onClose={() => setShowVetDetails(false)}
        />
      )}
    </div>
  )
}