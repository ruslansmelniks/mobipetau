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

  // Test function to create a sample appointment
  const createTestAppointment = async () => {
    try {
      console.log('Creating test appointment...');
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          pet_owner_id: userId,
          status: 'waiting_for_vet',
          date: new Date().toISOString().split('T')[0],
          time_slot: '09:00',
          address: 'Test Address',
          notes: 'Test appointment'
        })
        .select();
      
      console.log('Test appointment result:', { data, error });
    } catch (error) {
      console.error('Error creating test appointment:', error);
    }
  };

  const fetchAppointments = useCallback(async () => {
    if (!userId || !userRole) return;

    setLoading(true);
    console.log('Fetching appointments for:', { userId, userRole });
    console.log('Supabase client exists?', !!supabase);
    console.log('Supabase type:', typeof supabase);
    console.log('Supabase client:', supabase);

    try {
      // Test simple query first
      console.log('Testing simple query...');
      const { data: testData, error: testError } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);
      
      console.log('Test query result:', { testData, testError });
      console.log('Test data length:', testData?.length || 0);

      if (userRole === 'vet') {
        console.log('Vet query: fetching appointments where vet_id =', userId, 'OR status = waiting_for_vet');
        
        // First, let's check what statuses exist in the database
        const { data: statusData, error: statusError } = await supabase
          .from('appointments')
          .select('status')
          .limit(10);
        
        console.log('Available statuses:', statusData?.map(a => a.status) || []);
        console.log('Status query error:', statusError);

        // Check if there are any appointments at all
        const { data: allAppointments, error: allError } = await supabase
          .from('appointments')
          .select('*')
          .limit(5);
        
        console.log('All appointments sample:', allAppointments?.map(a => ({ id: a.id, status: a.status, vet_id: a.vet_id, pet_owner_id: a.pet_owner_id })) || []);
        console.log('All appointments error:', allError);

        console.log('Executing query...');
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .or(`vet_id.eq.${userId},status.eq.waiting_for_vet`)
          .order('created_at', { ascending: false });

        console.log('Query result:', { data, error, dataLength: data?.length || 0 });
        
        if (error) {
          console.error('Error fetching appointments:', error);
          return;
        }

        setAppointments(data || []);
        console.log('Set appointments:', data?.length || 0);
      } else {
        // Pet owner query
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('pet_owner_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching appointments:', error);
          return;
        }

        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Error in fetchAppointments:', error);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {userRole === 'vet' ? 'My Jobs' : 'My Bookings'}
        </h1>
        <button
          onClick={createTestAppointment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Test Appointment
        </button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="incoming">
            {userRole === 'vet' ? 'Available Jobs' : 'Incoming'}
          </TabsTrigger>
          <TabsTrigger value="ongoing">
            {userRole === 'vet' ? 'Active Jobs' : 'Ongoing'}
          </TabsTrigger>
          <TabsTrigger value="past">
            {userRole === 'vet' ? 'Completed Jobs' : 'Past'}
          </TabsTrigger>
        </TabsList>

        {['incoming', 'ongoing', 'past'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
                    <Calendar className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {tab === 'incoming' && (userRole === 'vet' ? 'No available jobs' : 'No incoming appointments')}
                  {tab === 'ongoing' && (userRole === 'vet' ? 'No active jobs' : 'No ongoing appointments')}
                  {tab === 'past' && (userRole === 'vet' ? 'No completed jobs' : 'No past appointments')}
                </h3>
                <p className="text-gray-600 mb-6 text-center max-w-sm">
                  {tab === 'incoming' && (userRole === 'pet_owner' 
                    ? 'You have no pending or requested appointments'
                    : 'You have no available job requests at the moment'
                  )}
                  {tab === 'ongoing' && (userRole === 'pet_owner' 
                    ? 'You have no confirmed appointments'
                    : 'You have no active jobs in progress'
                  )}
                  {tab === 'past' && (userRole === 'pet_owner' 
                    ? 'You have no completed or cancelled appointments'
                    : 'You have no completed jobs in your history'
                  )}
                </p>
                {tab === 'incoming' && userRole === 'pet_owner' && (
                  <Link href="/book">
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      Book appointment
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              filteredAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 