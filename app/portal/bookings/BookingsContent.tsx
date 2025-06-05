'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Appointment = Database['public']['Tables']['appointments']['Row']
type Pet = Database['public']['Tables']['pets']['Row']
type User = Database['public']['Tables']['users']['Row']

interface AppointmentWithDetails extends Appointment {
  pets?: Pet
  vet?: Pick<User, 'id' | 'first_name' | 'last_name'>
}

export default function BookingsContent({ userId, userRole }: { userId: string, userRole: string }) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (fetchingRef.current) return
    
    const fetchAppointments = async () => {
      fetchingRef.current = true
      setLoading(true)
      setError(null)
      
      try {
        const supabase = createClient()
        
        let query = supabase
          .from('appointments')
          .select(`
            *,
            pets (
              id,
              name,
              type,
              breed
            ),
            vet:vet_id (
              id,
              first_name,
              last_name
            )
          `)
        
        // Filter based on user role
        if (userRole === 'vet') {
          query = query.eq('vet_id', userId)
        } else {
          query = query.eq('pet_owner_id', userId)
        }
        
        // Order by date and time
        const { data, error: fetchError } = await query
          .order('date', { ascending: false })
          .order('time', { ascending: false })
        
        if (fetchError) {
          console.error('Supabase error:', fetchError)
          setError(fetchError.message)
        } else {
          setAppointments(data || [])
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load appointments')
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }

    fetchAppointments()
  }, [userId, userRole])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-semibold">Error loading appointments</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No appointments found.</p>
        {userRole === 'pet_owner' && (
          <button 
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            onClick={() => window.location.href = '/portal/vets'}
          >
            Find a Vet
          </button>
        )}
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'proposed': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  const formatTime = (time: string | null) => {
    if (!time) return 'No time set'
    return time
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {formatDate(appointment.date)}
              </h3>
              <p className="text-gray-600">
                {appointment.time_slot || appointment.time || appointment.time_of_day}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          
          <div className="space-y-2">
            {appointment.pets && (
              <p className="text-gray-700">
                <span className="font-medium">Pet:</span> {appointment.pets.name} ({appointment.pets.type})
              </p>
            )}
            
            {appointment.vet && userRole === 'pet_owner' && (
              <p className="text-gray-700">
                <span className="font-medium">Vet:</span> Dr. {appointment.vet.first_name} {appointment.vet.last_name}
              </p>
            )}
            
            {appointment.address && (
              <p className="text-gray-700">
                <span className="font-medium">Location:</span> {appointment.address}
              </p>
            )}
            
            {appointment.services && (
              <div className="text-gray-700">
                <span className="font-medium">Services:</span>
                <ul className="ml-5 mt-1 list-disc">
                  {Array.isArray(appointment.services) 
                    ? appointment.services.map((service: any, index: number) => (
                        <li key={index}>{service.name || service}</li>
                      ))
                    : <li>{String(appointment.services)}</li>
                  }
                </ul>
              </div>
            )}
            
            {appointment.total_price && (
              <p className="text-gray-700">
                <span className="font-medium">Total:</span> ${appointment.total_price}
              </p>
            )}
            
            {appointment.notes && (
              <p className="text-gray-700">
                <span className="font-medium">Notes:</span> {appointment.notes}
              </p>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Booking ID: {appointment.id.slice(0, 8)}
            </p>
            
            {appointment.status === 'pending' && userRole === 'pet_owner' && (
              <button 
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                onClick={() => {/* Add cancel functionality */}}
              >
                Cancel Appointment
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 