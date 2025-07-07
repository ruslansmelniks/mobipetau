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
  userProposal?: any // <-- add this line
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
  const [userProposals, setUserProposals] = useState<any[]>([])
  const [appointmentsWithProposals, setAppointmentsWithProposals] = useState<AppointmentWithDetails[]>([])
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Filter appointments based on active tab - MOVED BEFORE useEffect
  const getFilteredAppointments = (appointments: AppointmentWithDetails[]) => {
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

  // Helper to format proposed time
  const formatProposedTime = (proposal: any) => {
    if (!proposal) return '';
    let timeString = `${proposal.proposed_date} - ${proposal.proposed_time_range}`;
    if (proposal.proposed_exact_time) {
      timeString += ` at ${proposal.proposed_exact_time}`;
    }
    return timeString;
  };

  const supabase = createClient();

  // Handler functions for vet actions
  const handleAcceptJob = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, action: 'accept' })
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error accepting job:', error);
    }
  };
  const handleDecline = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, action: 'decline' })
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error declining job:', error);
    }
  };
  const handleProposeNewTime = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowProposeModal(true);
  };
  const handleProposeTime = async (proposalData: {
    proposedDate: string
    proposedTimeRange: string
    proposedExactTime?: string
    message?: string
  }) => {
    console.log('Submitting proposal with data:', proposalData);
    console.log('Selected appointment:', selectedAppointment);
    try {
      if (!selectedAppointment) {
        alert('No appointment selected');
        return;
      }
      const response = await fetch('/api/time-proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          proposedDate: proposalData.proposedDate,
          proposedTimeRange: proposalData.proposedTimeRange,
          proposedExactTime: proposalData.proposedExactTime,
          message: proposalData.message,
        }),
      });
      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData.error || 'Unknown error'}`);
      }
      console.log('Proposal submitted successfully');
      setShowProposeModal(false);
      setSelectedAppointment(null);
      window.location.reload();
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      alert(`Failed to submit proposal: ${error.message}`);
    }
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
    setLoading(true);
    try {
      // Step 1: Debug query to log all appointment statuses
      const { data: allStatuses } = await supabase
        .from('appointments')
        .select('status, id')
        .limit(10);
      console.log('All appointment statuses in database:', allStatuses);
      // Fetch appointments as before
      let apptData: any[] = [];
      let error: any = null;
      if (userRole === 'vet') {
        const { data: withPets, error: petsError } = await supabase
          .from('appointments')
          .select(`
            *,
            pets!appointments_pet_id_fkey(id, name, type, breed, image),
            users!appointments_pet_owner_id_fkey(id, first_name, last_name, email, phone)
          `)
          // .eq('status', 'requested') // Commented out
          .is('vet_id', null) // Only show jobs without a vet assigned
          .order('created_at', { ascending: false });
        apptData = withPets || [];
        error = petsError;
      } else {
        const { data, error: err } = await supabase
          .from('appointments')
          .select(`
            *,
            pets!appointments_pet_id_fkey(id, name, type, breed, image),
            users!appointments_pet_owner_id_fkey(id, first_name, last_name, email, phone)
          `)
          .eq('pet_owner_id', userId)
          .order('created_at', { ascending: false });
        apptData = data || [];
        error = err;
      }
      setAppointments(apptData);
      console.log('Raw appointments from database:', apptData);
      console.log('Appointments error:', error);
      // Fetch proposals for current vet
      if (userRole === 'vet') {
        const { data: proposals, error: proposalsError } = await supabase
          .from('time_proposals')
          .select('*')
          .eq('vet_id', userId);
        setUserProposals(proposals || []);
        console.log('User proposals from database:', proposals);
        console.log('Proposals error:', proposalsError);
        // After fetching appointments and proposals, fix the merging:
        const mergeProposals = (appointments: any[], userProposals: any[], userId: string) => {
          return appointments?.map(apt => {
            const userProposalsForThisAppt = userProposals?.filter(p => 
              p.appointment_id === apt.id && p.vet_id === userId
            );
            const latestUserProposal = userProposalsForThisAppt?.length > 0 
              ? userProposalsForThisAppt.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]
              : null;
            console.log(`Appointment ${apt.id} - Latest proposal:`, latestUserProposal);
            return {
              ...apt,
              userProposal: latestUserProposal
            };
          });
        };
        const merged = mergeProposals(apptData, proposals || [], userId);
        console.log('Final merged appointments with proposals:', merged);
        setAppointmentsWithProposals(merged);
      } else {
        setAppointmentsWithProposals(apptData);
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

  // Add withdraw proposal handler
  const handleWithdrawProposal = async (proposalId: string) => {
    const confirmed = window.confirm('Are you sure you want to withdraw your time proposal? This action cannot be undone.');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/time-proposals/${proposalId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to withdraw proposal');
      }
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to withdraw proposal: ${error.message}`);
    }
  };

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



  const filteredAppointments = userRole === 'vet' ? getFilteredAppointments(appointmentsWithProposals) : getFilteredAppointments(appointments);

  // Reusable appointment card component
  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => {
    console.log('Appointment with proposal data:', appointment);
    console.log('User proposal for this appointment:', appointment.userProposal);
    return (
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
            {/* Proposal Status Display */}
            {appointment.userProposal && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    New Time Proposed
                  </span>
                  <button
                    onClick={() => handleWithdrawProposal(appointment.userProposal.id)}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Withdraw proposal
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">
                    Proposed: {appointment.userProposal.proposed_date} - {appointment.userProposal.proposed_time_range}
                    {appointment.userProposal.proposed_exact_time && ` at ${appointment.userProposal.proposed_exact_time}`}
                  </p>
                  {appointment.userProposal.message && (
                    <p className="text-gray-600">
                      <span className="font-medium">Your note:</span> "{appointment.userProposal.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Sent {new Date(appointment.userProposal.created_at).toLocaleDateString()} at{' '}
                    {new Date(appointment.userProposal.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
            {/* Proposal status display for vet */}
            {userRole === 'vet' && appointment.userProposal && appointment.userProposal.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    New Time Proposed
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">
                    Proposed: {formatProposedTime(appointment.userProposal)}
                  </p>
                  {appointment.userProposal.message && (
                    <p className="text-gray-600">
                      <span className="font-medium">Your note:</span> "{appointment.userProposal.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Sent {new Date(appointment.userProposal.created_at).toLocaleDateString()} at{' '}
                    {new Date(appointment.userProposal.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
            {userRole === 'vet' && appointment.userProposal && appointment.userProposal.status === 'declined' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-2">
                  Proposed Time Declined
                </span>
                <p className="text-sm text-gray-600">
                  Your proposed time ({formatProposedTime(appointment.userProposal)}) was declined by the pet owner.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {appointment.pets && (
                <p className="text-gray-700">
                  <span className="font-medium">Pet:</span> {appointment.pets.name} ({appointment.pets.type})
                </p>
              )}
              {appointment.vet && userRole === 'pet_owner' && (
                <p className="text-gray-700">
                  <span className="font-medium">Vet:</span> Dr. {appointment.vet?.first_name} {appointment.vet?.last_name}
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
            {/* Action Buttons Section */}
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => handleAcceptJob(appointment.id)} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {appointment.userProposal ? 'Accept Original Time' : 'Accept Job'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDecline(appointment.id)} 
                className="flex-1"
              >
                Decline
              </Button>
              {appointment.userProposal ? (
                <Button 
                  variant="outline" 
                  disabled
                  className="flex-1 opacity-50 cursor-not-allowed"
                >
                  Time Proposed
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => handleProposeNewTime(appointment)} 
                  className="flex-1"
                >
                  Propose New Time
                </Button>
              )}
            </div>
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
      </div>
    )
  }

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
      {/* Propose Time Modal - only render once, after Tabs */}
      {showProposeModal && selectedAppointment && (
        <ProposeTimeModal
          isOpen={showProposeModal}
          onClose={() => {
            setShowProposeModal(false);
            setSelectedAppointment(null);
          }}
          appointment={{
            id: selectedAppointment.id || '',
            date: selectedAppointment.date || '',
            time: selectedAppointment.time || '',
            time_of_day: selectedAppointment.time_of_day || '',
            address: selectedAppointment.address || '',
            notes: selectedAppointment.notes || '',
            pets: selectedAppointment.pets,
            users: selectedAppointment.vet ? {
              first_name: selectedAppointment.vet.first_name || '',
              last_name: selectedAppointment.vet.last_name || ''
            } : undefined
          }}
          onSubmit={handleProposeTime}
        />
      )}
    </div>
  );
} 