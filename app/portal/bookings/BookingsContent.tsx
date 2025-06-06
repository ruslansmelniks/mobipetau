'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getStatusLabel } from '@/lib/appointment-statuses'
import { useToast } from '@/hooks/use-toast'

interface AppointmentWithDetails {
  id: string
  date: string
  time_slot: string
  status: string
  address: string
  services: any[]
  total_price: number
  notes?: string
  pets?: {
    id: string
    name: string
    type: string
    breed?: string
    image?: string
  }
  vet?: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function BookingsContent({ userId, userRole }: { userId: string, userRole: string }) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('/api/bookings')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch appointments')
        }
        
        const data = await response.json()
        setAppointments(data.appointments || [])
      } catch (err) {
        console.error('Error fetching appointments:', err)
        setError(err instanceof Error ? err.message : 'Failed to load appointments')
        toast({
          title: 'Error',
          description: 'Failed to load appointments. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Appointments</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No appointments yet</h2>
        <p className="text-gray-600 mb-6">
          {userRole === 'pet_owner' 
            ? "You don't have any appointments scheduled." 
            : "You don't have any assigned appointments."}
        </p>
        {userRole === 'pet_owner' && (
          <Button asChild>
            <Link href="/book">Book an Appointment</Link>
          </Button>
        )}
      </div>
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No date set'
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const status = getStatusLabel(appointment.status)
        
        return (
          <div key={appointment.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {appointment.pets?.name || 'Unknown Pet'}
                  </h3>
                  <p className="text-gray-600">
                    {appointment.pets?.type} {appointment.pets?.breed && `• ${appointment.pets.breed}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-gray-600">
                      {formatDate(appointment.date)} • {appointment.time_slot || 'Time not set'}
                    </p>
                  </div>
                </div>

                {appointment.address && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600">{appointment.address}</p>
                    </div>
                  </div>
                )}

                {appointment.vet && userRole === 'pet_owner' && (
                  <div className="flex items-start">
                    <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3">👨‍⚕️</div>
                    <div>
                      <p className="font-medium">Veterinarian</p>
                      <p className="text-gray-600">
                        Dr. {appointment.vet.first_name} {appointment.vet.last_name}
                      </p>
                    </div>
                  </div>
                )}

                {appointment.services && appointment.services.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Services</p>
                    <ul className="text-gray-600 text-sm space-y-1">
                      {appointment.services.map((service: any, index: number) => (
                        <li key={index}>• {service.name || service}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {appointment.total_price && (
                  <div>
                    <p className="font-medium">Total Price</p>
                    <p className="text-gray-600">${appointment.total_price}</p>
                  </div>
                )}

                {appointment.notes && (
                  <div>
                    <p className="font-medium">Notes</p>
                    <p className="text-gray-600">{appointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-500">ID: {appointment.id.slice(0, 8)}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/portal/messages?appointment=${appointment.id}`}>
                    View Messages
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 