'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [activeTab, setActiveTab] = useState('incoming')
  const fetchingRef = useRef(false)

  // Filter appointments based on active tab - MOVED BEFORE useEffect
  const getFilteredAppointments = () => {
    const isVet = userRole === 'vet';
    
    switch (activeTab) {
      case 'incoming':
        if (isVet) {
          // For vets: show jobs they can accept (waiting_for_vet) or jobs specifically assigned to them
          return appointments.filter(appointment => 
            appointment.status === 'waiting_for_vet' || 
            (appointment.vet_id === userId && ['requested', 'pending', 'proposed_time'].includes(appointment.status))
          );
        } else {
          // For pet owners: show their pending appointments
          return appointments.filter(appointment => 
            ['requested', 'pending', 'proposed_time', 'waiting_for_vet'].includes(appointment.status)
          );
        }
      case 'ongoing':
        return appointments.filter(appointment => 
          ['confirmed', 'accepted'].includes(appointment.status)
        );
      case 'past':
        return appointments.filter(appointment => 
          ['completed', 'cancelled', 'rejected'].includes(appointment.status)
        );
      default:
        return appointments;
    }
  };

  const supabase = createClient();

  // Remove test function and button
  // Remove all debug logs from fetchAppointments
  const fetchAppointments = useCallback(async () => {
    if (!userId || !userRole) return;
    setLoading(true);
    try {
      if (userRole === 'vet') {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .or(`vet_id.eq.${userId},status.eq.waiting_for_vet`)
          .order('created_at', { ascending: false });
        if (error) return;
        setAppointments(data || []);
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('pet_owner_id', userId)
          .order('created_at', { ascending: false });
        if (error) return;
        setAppointments(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, supabase]);

  useEffect(() => {
    if (fetchingRef.current) return
    
    fetchAppointments()
  }, [userId, userRole, fetchAppointments])

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

  // Always show the tabbed interface, even when no appointments
  // The empty states will be handled within each tab

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



  const filteredAppointments = getFilteredAppointments()

  // Reusable appointment card component
  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
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
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="incoming">{userRole === 'vet' ? 'Available Jobs' : 'Incoming'}</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        {['incoming', 'ongoing', 'past'].map((tab) => (
          <TabsContent key={tab} value={tab} className="w-full">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <span>Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center text-gray-500">No appointments found.</div>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 