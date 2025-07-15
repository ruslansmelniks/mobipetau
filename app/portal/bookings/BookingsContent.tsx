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
import { WithdrawProposalModal } from '@/components/withdraw-proposal-modal'
import { CancelAppointmentModal } from '@/components/cancel-appointment-modal'

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
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([])
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [proposalsError, setProposalsError] = useState<string | null>(null)
  const [respondingProposalId, setRespondingProposalId] = useState<string | null>(null)
  const [userProposals, setUserProposals] = useState<any[]>([])
  const [appointmentsWithProposals, setAppointmentsWithProposals] = useState<AppointmentWithDetails[]>([])
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [proposalToWithdraw, setProposalToWithdraw] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [loadingActions, setLoadingActions] = useState<Record<string, 'accept' | 'decline' | 'propose'>>({});

  // Function to mark notifications as read when viewing available jobs
  const markNotificationsAsRead = async (appointmentIds: string[]) => {
    if (userRole !== 'vet' || appointmentIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('appointment_id', appointmentIds)
        .eq('user_id', userId)
        .eq('type', 'new_appointment');
      
      if (error) {
        console.error('Error marking notifications as read:', error);
      } else {
        console.log('Marked notifications as read for appointments:', appointmentIds);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Effect to mark notifications as read when viewing available jobs
  useEffect(() => {
    if (userRole === 'vet' && activeTab === 'incoming' && appointments.length > 0) {
      const availableJobs = appointments.filter(appointment => 
        appointment.status === 'waiting_for_vet' && !appointment.vet_id
      );
      
      if (availableJobs.length > 0) {
        const appointmentIds = availableJobs.map(job => job.id);
        markNotificationsAsRead(appointmentIds);
      }
    }
  }, [appointments, activeTab, userRole, userId]);

  // Function to remove duplicate appointments
  const removeDuplicates = (appointments: AppointmentWithDetails[]) => {
    const seen = new Set();
    return appointments.filter(appointment => {
      const duplicate = seen.has(appointment.id);
      seen.add(appointment.id);
      return !duplicate;
    });
  };

  // Filter appointments based on active tab - MOVED BEFORE useEffect
  const getFilteredAppointments = (appointments: AppointmentWithDetails[]) => {
    console.log('Filtering appointments:', appointments);
    const isVet = userRole === 'vet';
    
    // Remove duplicates first
    const uniqueAppointments = removeDuplicates(appointments);
    console.log('Unique appointments after deduplication:', uniqueAppointments);
    
    switch (activeTab) {
      case 'incoming':
        if (isVet) {
          // For vets: only show unassigned jobs
          const availableJobs = uniqueAppointments.filter(appointment => 
            appointment.status === 'waiting_for_vet' && !appointment.vet_id
          );
          console.log('Available jobs for vet:', availableJobs);
          console.log('Jobs with action buttons:', availableJobs.filter(job => 
            job.status === 'waiting_for_vet' && !job.vet_id
          ));
          return availableJobs;
        } else {
          // For pet owners: show pending appointments
          return uniqueAppointments.filter(appointment => 
            ['requested', 'pending', 'proposed_time', 'waiting_for_vet'].includes(appointment.status) &&
            appointment.pet_owner_id === userId
          );
        }
      case 'ongoing':
        // Both vets and owners see confirmed appointments
        return uniqueAppointments.filter(appointment => {
          if (isVet) {
            return appointment.status === 'confirmed' && appointment.vet_id === userId;
          } else {
            return appointment.status === 'confirmed' && appointment.pet_owner_id === userId;
          }
        });
      case 'past':
        return uniqueAppointments.filter(appointment => 
          ['completed', 'cancelled', 'rejected', 'declined'].includes(appointment.status) &&
          (isVet ? appointment.vet_id === userId : appointment.pet_owner_id === userId)
        );
      default:
        return uniqueAppointments;
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

  // Add proposal status card component
  const ProposalStatusCard = ({ appointment }: { appointment: any }) => {
    if (appointment.status !== 'proposed_time' || !appointment.proposed_time) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏰ Waiting for Response
          </span>
          {userRole === 'vet' && (
            <button
              onClick={() => handleWithdrawProposal(appointment.id)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Withdraw Proposal
            </button>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">
            Proposed: {appointment.proposed_time}
          </p>
          {appointment.proposed_message && (
            <p className="text-gray-600">
              Note: "{appointment.proposed_message}"
            </p>
          )}
          <p className="text-xs text-gray-500">
            Sent {new Date(appointment.proposed_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };



  const supabase = createClient();

  // Handler functions for vet actions
  const handleAcceptJob = async (appointmentId: string) => {
    setLoadingActions(prev => ({ ...prev, [appointmentId]: 'accept' }));
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "No active session. Please log in again.",
          variant: "destructive",
        });
        return;
      }
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          action: 'accept'
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept appointment');
      }
      toast({
        title: "Success",
        description: "Appointment accepted successfully",
      });
      if (typeof fetchAppointments === 'function') {
        fetchAppointments();
      }
      if (setAppointments) {
        setAppointments((prev: any[]) => 
          prev.map(apt => 
            apt.id === appointmentId 
              ? { ...apt, status: 'confirmed', vet_id: session.user.id } 
              : apt
          )
        );
      }
    } catch (error: any) {
      console.error('Error accepting appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept appointment",
        variant: "destructive",
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[appointmentId];
        return newState;
      });
    }
  };
  const handleDeclineJob = async (appointmentId: string, message: string) => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "No active session. Please log in again.",
          variant: "destructive",
        });
        return;
      }
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          action: 'decline',
          message: message || 'Appointment declined by veterinarian'
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline appointment');
      }
      toast({
        title: "Success",
        description: "Appointment declined successfully",
      });
      if (typeof fetchAppointments === 'function') {
        fetchAppointments();
      }
      if (setAppointments) {
        setAppointments((prev: any[]) => 
          prev.map(apt => 
            apt.id === appointmentId 
              ? { ...apt, status: 'declined' } 
              : apt
          )
        );
      }
    } catch (error: any) {
      console.error('Error declining appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline appointment",
        variant: "destructive",
      });
    }
  };
  const handleProposeNewTime = (appointment: any) => {
    // Add debug logging to see what data we have
    console.log('handleProposeNewTime - appointment data:', appointment);
    console.log('Available fields:', Object.keys(appointment));
    console.log('Time slot value:', appointment.time_slot);
    
    // Use the EXACT SAME LOGIC as the card uses to get the time slot
    const timeSlot = hasTimeSlot(appointment) ? appointment.time_slot : undefined;
    console.log('Extracted time slot:', timeSlot);
    
    // Create a complete appointment object with the time_slot
    const completeAppointment = {
      ...appointment,
      time_slot: timeSlot
    };
    
    console.log('Complete appointment with time_slot:', completeAppointment);
    setSelectedAppointment(completeAppointment);
    setShowProposeModal(true);
  };
  const handleProposeTime = async (proposalData: { appointmentId: string; proposedDate: string; proposedTime: string; message?: string }) => {
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
          proposedTimeRange: proposalData.proposedTime,
          message: proposalData.message,
        }),
      });
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData.error || 'Unknown error'}`);
      }
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
      // Fetch appointments as before
      let apptData: any[] = [];
      let error: any = null;
      if (userRole === 'vet') {
        const { data: withPets, error: petsError } = await supabase
          .from('appointments')
          .select(`
            *,
            time_slot,
            pets:pet_id (
              id,
              name,
              type,
              breed,
              image,
              age,
              weight
            ),
            pet_owner:pet_owner_id (
              id,
              first_name,
              last_name,
              email,
              phone
            )
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
            time_slot,
            pets:pet_id (
              id,
              name,
              type,
              breed,
              image,
              age,
              weight
            ),
            pet_owner:pet_owner_id (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('pet_owner_id', userId)
          .order('created_at', { ascending: false });
        apptData = data || [];
        error = err;
      }
      setAppointments(apptData);
      // Fetch proposals for current vet
      if (userRole === 'vet') {
        const { data: proposals, error: proposalsError } = await supabase
          .from('time_proposals')
          .select('*')
          .eq('vet_id', userId);
        setUserProposals(proposals || []);
        // After fetching appointments and proposals, fix the merging:
        const mergeProposals = (appointments: any[], userProposals: any[], userId: string) => {
          return appointments?.map(apt => {
            const userProposalsForThisAppt = userProposals?.filter(p => 
              p.appointment_id === apt.id && p.vet_id === userId
            );
            let latestUserProposal = null;
            if (userProposalsForThisAppt && userProposalsForThisAppt.length > 0) {
              latestUserProposal = userProposalsForThisAppt.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
            }
            return {
              ...apt,
              userProposal: latestUserProposal
            };
          });
        };
        const merged = mergeProposals(apptData, proposals || [], userId);
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
  const handleWithdrawProposal = async (proposalOrAppointmentId: any) => {
    // If it's a proposal object (from time_proposals table)
    if (typeof proposalOrAppointmentId === 'object' && proposalOrAppointmentId.id) {
      setProposalToWithdraw(proposalOrAppointmentId);
      setShowWithdrawModal(true);
      return;
    }
    
    // If it's an appointment ID (from appointments table proposal)
    if (typeof proposalOrAppointmentId === 'string') {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'requested',
            proposed_time: null,
            proposed_message: null,
            proposed_at: null
          })
          .eq('id', proposalOrAppointmentId);

        if (!error) {
          toast({
            title: "Success",
            description: "Time proposal withdrawn",
          });
          // Refresh appointments
          await fetchAppointments();
        }
      } catch (error) {
        console.error('Error withdrawing proposal:', error);
        toast({
          title: "Error",
          description: "Failed to withdraw proposal",
          variant: "destructive",
        });
      }
    }
  };
  const confirmWithdrawProposal = async () => {
    if (!proposalToWithdraw) return;
    try {
      const response = await fetch(`/api/time-proposals/${proposalToWithdraw.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to withdraw proposal');
      }
      setShowWithdrawModal(false);
      setProposalToWithdraw(null);
      window.location.reload();
    } catch (error: any) {
      console.error('Error withdrawing proposal:', error);
      alert(`Failed to withdraw proposal: ${error.message}`);
      setShowWithdrawModal(false);
      setProposalToWithdraw(null);
    }
  };
  const cancelWithdrawProposal = () => {
    setShowWithdrawModal(false);
    setProposalToWithdraw(null);
  };

  const handleCancelAppointment = (appointment: any) => {
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    try {
      const response = await fetch(`/api/appointments/${appointmentToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      window.location.reload();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      alert(`Failed to cancel appointment: ${error.message}`);
      setShowCancelModal(false);
      setAppointmentToCancel(null);
    }
  };

  const cancelCancelAppointment = () => {
    setShowCancelModal(false);
    setAppointmentToCancel(null);
  };

  useEffect(() => {
    if (fetchingRef.current) return
    
    fetchAppointments()
  }, [userId, userRole, fetchAppointments])

  // Add real-time subscription for appointment updates
  useEffect(() => {
    if (!userId) return;
    
    console.log('Setting up real-time subscription');
    
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: userRole === 'vet' 
            ? `vet_id=eq.${userId}` 
            : `pet_owner_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Appointment change detected:', payload);
          fetchAppointments();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole]);

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

  // Type guard for time_slot
  function hasTimeSlot(obj: any): obj is { time_slot?: string } {
    return (
      obj &&
      typeof obj === 'object' &&
      !Array.isArray(obj) &&
      'time_slot' in obj &&
      (typeof obj.time_slot === 'string' || typeof obj.time_slot === 'undefined')
    );
  }

  const filteredAppointments = userRole === 'vet' ? getFilteredAppointments(appointmentsWithProposals) : getFilteredAppointments(appointments);

  // Debug functions for testing
  const clearAllData = async () => {
    try {
      const response = await fetch('/api/debug/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "All data cleared successfully",
        });
        // Refresh appointments
        await fetchAppointments();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to clear data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      });
    }
  };

  const createTestAppointment = async () => {
    try {
      const response = await fetch('/api/debug/create-test-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petOwnerId: userId })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Test appointment created successfully",
        });
        // Refresh appointments
        await fetchAppointments();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create test appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating test appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create test appointment",
        variant: "destructive",
      });
    }
  };

  // Reusable appointment card component
  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => {
    // Add debug logging for the card
    console.log('AppointmentCard - appointment data:', appointment);
    console.log('Card time_slot:', hasTimeSlot(appointment) ? appointment.time_slot : undefined);
    console.log('Card time:', appointment.time);
    console.log('Card services:', appointment.services);
    console.log('Card status:', appointment.status);
    console.log('Card vet_id:', appointment.vet_id);
    console.log('User role:', userRole);
    console.log('Should show action buttons:', userRole === 'vet' && appointment.status === 'waiting_for_vet' && !appointment.vet_id);
    
    return (
      <div key={appointment.id} className={`bg-white p-6 rounded-lg shadow-sm border ${
        userRole === 'vet' && appointment.status === 'waiting_for_vet' && !appointment.vet_id 
          ? 'border-l-4 border-l-blue-500 bg-blue-50' 
          : ''
      }`}>
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
                  {/* Use the same logic as the modal will use */}
                  {hasTimeSlot(appointment) ? appointment.time_slot : undefined}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(appointment.status)}`}>
                  {formatStatus(appointment.status)}
                </span>
                {userRole === 'vet' && appointment.status === 'waiting_for_vet' && !appointment.vet_id && 
                 new Date(appointment.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-medium">
                    New
                  </span>
                )}
              </div>
            </div>
            {/* Proposal Status Display */}
            {appointment.userProposal && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    New Time Proposed
                  </span>
                  <button
                    onClick={() => handleWithdrawProposal(appointment.userProposal)}
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
            {/* Appointment-level proposal status display */}
            <ProposalStatusCard appointment={appointment} />
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
            {/* In AppointmentCard, for pet owners, show indicator if userProposal is pending */}
            {userRole === 'pet_owner' && appointment.userProposal && appointment.userProposal.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  New time proposed by your vet
                </span>
                <div className="text-sm mt-1">
                  Proposed: {appointment.userProposal.proposed_date} - {appointment.userProposal.proposed_time_range}
                  {appointment.userProposal.proposed_exact_time && ` at ${appointment.userProposal.proposed_exact_time}`}
                </div>
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
              {userRole === 'vet' ? (
                // VET ACTIONS
                <>
                  {!appointment.userProposal ? (
                    // No proposal yet - show all vet options
                    <>
                      <Button 
                        onClick={() => handleAcceptJob(appointment.id)} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'accept' ? 'Accepting...' : 'Accept Job'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeclineJob(appointment.id, '')} 
                        className="flex-1"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'decline' ? 'Declining...' : 'Decline'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleProposeNewTime(appointment)} 
                        className="flex-1"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'propose' ? 'Proposing...' : 'Propose New Time'}
                      </Button>
                    </>
                  ) : appointment.userProposal.status === 'pending' ? (
                    // Proposal pending - limited vet options
                    <>
                      <Button 
                        onClick={() => handleAcceptJob(appointment.id)} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'accept' ? 'Accepting...' : 'Accept Original Time'}
                      </Button>
                      <Button 
                        variant="outline" 
                        disabled
                        className="flex-1 opacity-50 cursor-not-allowed"
                      >
                        Time Proposed
                      </Button>
                    </>
                  ) : (
                    // Proposal declined - show all vet options again
                    <>
                      <Button 
                        onClick={() => handleAcceptJob(appointment.id)} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'accept' ? 'Accepting...' : 'Accept Job'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeclineJob(appointment.id, '')} 
                        className="flex-1"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'decline' ? 'Declining...' : 'Decline'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleProposeNewTime(appointment)} 
                        className="flex-1"
                        disabled={!!loadingActions[appointment.id]}
                      >
                        {loadingActions[appointment.id] === 'propose' ? 'Proposing...' : 'Propose New Time'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                // PET OWNER ACTIONS
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelAppointment(appointment)}
                    className="text-red-600 hover:underline text-sm font-medium"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
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
      {/* Debug buttons for testing - only show for pet owners */}
      {userRole === 'pet_owner' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🧪 Debug Tools</h3>
          <div className="flex gap-2">
            <Button
              onClick={clearAllData}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Clear All Data
            </Button>
            <Button
              onClick={createTestAppointment}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              Create Test Appointment
            </Button>
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            These buttons are for testing purposes only. Use them to quickly create test data or clear everything.
          </p>
        </div>
      )}
      
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
          appointment={selectedAppointment}
          onSubmit={handleProposeTime}
        />
      )}
      {showWithdrawModal && proposalToWithdraw && (
        <WithdrawProposalModal
          isOpen={showWithdrawModal}
          onClose={cancelWithdrawProposal}
          onConfirm={confirmWithdrawProposal}
          proposalDetails={{
            date: proposalToWithdraw.proposed_date,
            timeRange: proposalToWithdraw.proposed_time_range,
            exactTime: proposalToWithdraw.proposed_exact_time
          }}
        />
      )}
      {showCancelModal && appointmentToCancel && (
        <CancelAppointmentModal
          isOpen={showCancelModal}
          onClose={cancelCancelAppointment}
          onConfirm={confirmCancelAppointment}
          appointment={appointmentToCancel}
        />
      )}
    </div>
  );
} 