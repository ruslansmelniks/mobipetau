'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast';
import { ProposeTimeModal } from '@/components/propose-time-modal'

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
  const [proposeModalOpen, setProposeModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [proposalsError, setProposalsError] = useState<string | null>(null)
  const [respondingProposalId, setRespondingProposalId] = useState<string | null>(null)

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

  // Handler functions for vet actions
  const handleAcceptJob = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'accepted',
          vet_id: userId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
      if (error) throw error;
      await fetchAppointments();
      toast({ title: 'Job accepted successfully!' });
    } catch (error) {
      console.error('Error accepting job:', error);
      toast({ title: 'Failed to accept job', description: String(error), });
    }
  };

  const handleDeclineJob = async (appointmentId: string) => {
    try {
      const { error: declineError } = await supabase
        .from('declined_jobs')
        .insert({ 
          vet_id: userId,
          appointment_id: appointmentId,
          declined_at: new Date().toISOString()
        });
      if (declineError) throw declineError;
      await fetchAppointments();
      toast({ title: 'Job declined' });
    } catch (error) {
      console.error('Error declining job:', error);
      toast({ title: 'Failed to decline job', description: String(error), });
    }
  };

  const handleProposeNewTime = (appointmentId: string) => {
    console.log('Propose new time for appointment:', appointmentId);
    toast({ title: 'Propose new time feature coming soon!' });
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'waiting_for_vet': 'Waiting for vet',
      'accepted': 'Accepted',
      'confirmed': 'Confirmed',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'rejected': 'Rejected',
      'pending': 'Pending',
      'proposed_time': 'Time proposed'
    };
    return statusMap[status] || status;
  };

  const fetchAppointments = useCallback(async () => {
    console.log('fetchAppointments called', { userId, userRole });
    if (!userId || !userRole) {
      console.log('Missing userId or userRole');
      return;
    }
    setLoading(true);
    try {
      if (userRole === 'vet') {
        const { data: withPets, error: petsError } = await supabase
          .from('appointments')
          .select(`
            *,
            pets (
              id, name, type, breed, image
            ),
            pet_owner:users!appointments_pet_owner_id_fkey (
              id, first_name, last_name, email
            ),
            vet:users!appointments_vet_id_fkey (
              id, first_name, last_name, email
            )
          `)
          .or(`vet_id.eq.${userId},status.eq.waiting_for_vet`)
          .order('created_at', { ascending: false });
        console.log('Query completed:', { data: withPets, error: petsError });
        if (petsError) return setAppointments([]);
        setAppointments(withPets || []);
        return;
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            pets (
              id, name, type, breed, image
            ),
            pet_owner:users!appointments_pet_owner_id_fkey (
              id, first_name, last_name, email
            ),
            vet:users!appointments_vet_id_fkey (
              id, first_name, last_name, email
            )
          `)
          .eq('pet_owner_id', userId)
          .order('created_at', { ascending: false });
        console.log('Query completed:', { data, error });
        if (error) return setAppointments([]);
        setAppointments(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, supabase]);

  const fetchProposals = useCallback(async (appointmentId: string) => {
    setProposalsLoading(true)
    setProposalsError(null)
    try {
      const res = await fetch(`/api/time-proposals?appointmentId=${appointmentId}`)
      const json = await res.json()
      if (res.ok) {
        setProposals(json.proposals || [])
      } else {
        setProposals([])
        setProposalsError(json.error || 'Failed to fetch proposals')
      }
    } catch (err) {
      setProposals([])
      setProposalsError('Failed to fetch proposals')
    } finally {
      setProposalsLoading(false)
    }
  }, [])

  const openProposeModal = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment)
    setProposeModalOpen(true)
  }
  const closeProposeModal = () => {
    setProposeModalOpen(false)
    setSelectedAppointment(null)
  }
  const handleProposeSubmit = async (proposalData: any) => {
    if (!selectedAppointment) return
    try {
      const res = await fetch('/api/time-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          ...proposalData
        })
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to propose time')
      }
      toast({ title: 'Proposal sent!' })
      closeProposeModal()
      await fetchAppointments()
    } catch (err: any) {
      toast({ title: 'Failed to send proposal', description: err.message })
    }
  }
  const handleViewProposals = async (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment)
    await fetchProposals(appointment.id)
  }
  const handleRespondProposal = async (proposalId: string, status: 'accepted' | 'declined') => {
    setRespondingProposalId(proposalId)
    try {
      const res = await fetch(`/api/time-proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to respond')
      }
      toast({ title: status === 'accepted' ? 'Proposal accepted!' : 'Proposal declined!' })
      await fetchAppointments()
      await fetchProposals(selectedAppointment?.id || '')
    } catch (err: any) {
      toast({ title: 'Failed to respond', description: err.message })
    } finally {
      setRespondingProposalId(null)
    }
  }

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
      <div className="flex gap-4">
        {appointment.pets?.image && (
          <div className="flex-shrink-0">
            <img 
              src={appointment.pets.image} 
              alt={appointment.pets.name || 'Pet'} 
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {formatDate(appointment.date)}
              </h3>
              <p className="text-gray-600">
                {appointment.time_slot || appointment.time || appointment.time_of_day}
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(appointment.status)}`}>
              {formatStatus(appointment.status)}
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
          {/* Vet action buttons */}
          {userRole === 'vet' && appointment.status === 'waiting_for_vet' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button 
                onClick={() => handleAcceptJob(appointment.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Accept Job
              </Button>
              <Button 
                onClick={() => handleDeclineJob(appointment.id)}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Decline
              </Button>
              <Button 
                onClick={() => openProposeModal(appointment)}
                variant="outline"
              >
                Propose New Time
              </Button>
            </div>
          )}
          {/* Pet owner: view proposals if any exist */}
          {userRole === 'pet_owner' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button 
                onClick={() => handleViewProposals(appointment)}
                variant="outline"
              >
                View Time Proposals
              </Button>
            </div>
          )}
          {/* Show proposals modal for pet owner */}
          {selectedAppointment && selectedAppointment.id === appointment.id && proposals.length > 0 && userRole === 'pet_owner' && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Time Proposals</h4>
              {proposalsLoading ? (
                <div>Loading proposals...</div>
              ) : proposalsError ? (
                <div className="text-red-600">{proposalsError}</div>
              ) : (
                <div className="space-y-2">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="border rounded p-3 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <div><span className="font-medium">Date:</span> {proposal.proposed_date}</div>
                        <div><span className="font-medium">Time Range:</span> {proposal.proposed_time_range}</div>
                        {proposal.proposed_exact_time && <div><span className="font-medium">Exact Time:</span> {proposal.proposed_exact_time}</div>}
                        {proposal.message && <div><span className="font-medium">Message:</span> {proposal.message}</div>}
                        <div><span className="font-medium">Status:</span> {proposal.status}</div>
                      </div>
                      {proposal.status === 'pending' && (
                        <div className="flex gap-2 mt-2 md:mt-0">
                          <Button size="sm" onClick={() => handleRespondProposal(proposal.id, 'accepted')} disabled={respondingProposalId === proposal.id}>
                            {respondingProposalId === proposal.id ? 'Accepting...' : 'Accept'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRespondProposal(proposal.id, 'declined')} disabled={respondingProposalId === proposal.id}>
                            {respondingProposalId === proposal.id ? 'Declining...' : 'Decline'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Propose Time Modal for vet */}
      {proposeModalOpen && selectedAppointment && selectedAppointment.id === appointment.id && (
        <ProposeTimeModal
          isOpen={proposeModalOpen}
          onClose={closeProposeModal}
          appointment={{
            id: appointment.id,
            date: appointment.date || '',
            time: appointment.time || '',
            time_of_day: appointment.time_of_day || '',
            address: appointment.address || '',
            notes: appointment.notes || '',
            pets: appointment.pets,
            users: userRole === 'pet_owner' && appointment.vet ? {
              first_name: appointment.vet.first_name || '',
              last_name: appointment.vet.last_name || ''
            } : undefined
          }}
          onSubmit={handleProposeSubmit}
        />
      )}
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