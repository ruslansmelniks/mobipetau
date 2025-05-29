"use client"

import { useUser } from '@supabase/auth-helpers-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, AlertCircle, Check, X } from 'lucide-react';
import { formatAppointmentDate } from '@/lib/utils';
import Link from 'next/link';
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function BookingsPage() {
  const user = useUser();
  const { useUserAppointments } = useAppointments();
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  
  const { data: appointments, isLoading, error, refetch } = useUserAppointments(user?.id ?? '');

  // Add retry logic
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        refetch();
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, refetch]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-gray-600">Please sign in to view your appointments.</p>
          <Link href="/login">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error && retryCount >= 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Appointments</h2>
          <p className="text-gray-600 mb-4">We're having trouble loading your appointments. This might be a temporary issue.</p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setRetryCount(0);
                refetch();
              }}
              className="w-full"
            >
              Try Again
            </Button>
            <Link href="/book">
              <Button variant="outline" className="w-full">
                Book New Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-gray-600">No appointments found.</p>
          <Link href="/book/appointment">
            <Button className="mt-4">Book an Appointment</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Add a helper function to render status-specific messages
  const renderStatusMessage = (appointment: any) => {
    switch (appointment.status) {
      case 'waiting_for_vet':
        return (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mt-2">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              Waiting for a vet to accept your appointment
            </p>
          </div>
        );
      case 'time_proposed':
        return (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mt-2">
            <p className="text-sm text-blue-800 font-medium">
              The vet has proposed a new time:
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {appointment.proposed_time}
            </p>
            {appointment.proposed_message && (
              <p className="text-sm text-blue-600 mt-1">
                Message: {appointment.proposed_message}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => handleAcceptProposal(appointment.id)}>
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDeclineProposal(appointment.id)}>
                Decline
              </Button>
            </div>
          </div>
        );
      case 'confirmed':
        return (
          <div className="bg-green-50 border border-green-200 p-3 rounded-md mt-2">
            <p className="text-sm text-green-800">
              <Check className="inline h-4 w-4 mr-1" />
              Appointment confirmed by vet
            </p>
          </div>
        );
      case 'declined':
        return (
          <div className="bg-red-50 border border-red-200 p-3 rounded-md mt-2">
            <p className="text-sm text-red-800">
              <X className="inline h-4 w-4 mr-1" />
              Appointment declined by vet
            </p>
            <Button size="sm" className="mt-2" onClick={() => router.push('/book')}>
              Book New Appointment
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const handleAcceptProposal = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/appointments/owner-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          action: 'accept_proposal',
        }),
      });

      if (!response.ok) throw new Error('Failed to accept proposal');
      
      toast({
        title: "Success",
        description: "New time accepted",
      });
      
      refetch(); // Refresh appointments
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept proposal",
        variant: "destructive",
      });
    }
  };

  const handleDeclineProposal = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/appointments/owner-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          action: 'decline_proposal',
        }),
      });

      if (!response.ok) throw new Error('Failed to decline proposal');
      
      toast({
        title: "Proposal declined",
        description: "The appointment has been cancelled",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline proposal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Link href="/book">
          <Button>Book New Appointment</Button>
        </Link>
      </div>

      {appointments && appointments.length > 0 ? (
        <div className="grid gap-6">
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <CardTitle>Appointment for {appointment.pets?.name}</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{appointment.status.replace('_', ' ')}</span>
                    {appointment.services && Array.isArray(appointment.services) && appointment.services.length > 0 && (
                      <span className="text-gray-500">
                        • {appointment.services.map((s: any) => s.name || s).join(', ')}
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{appointment.date ? formatAppointmentDate(appointment.date) : 'Date not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{appointment.time_slot || 'Time not set'}</span>
                  </div>
                  {appointment.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{appointment.address}</span>
                    </div>
                  )}
                </div>
                {renderStatusMessage(appointment)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Appointments Yet</h2>
          <p className="text-gray-600 mb-4">You haven't booked any appointments yet.</p>
          <Link href="/book">
            <Button>Book Your First Appointment</Button>
          </Link>
        </div>
      )}
    </div>
  );
}