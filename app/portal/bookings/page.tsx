"use client"

import { useUser } from '@supabase/auth-helpers-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { formatAppointmentDate } from '@/lib/utils';
import Link from 'next/link';

export default function BookingsPage() {
  const user = useUser();
  const { useUserAppointments } = useAppointments();
  const [retryCount, setRetryCount] = useState(0);
  
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
                  Status: <span className="capitalize">{appointment.status}</span>
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
                    <span>{appointment.time_slot}</span>
                  </div>
                  {appointment.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{appointment.address}</span>
                    </div>
                  )}
                </div>
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