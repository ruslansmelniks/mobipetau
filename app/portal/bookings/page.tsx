"use client"

import { useUser } from '@supabase/auth-helpers-react';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentWithRelations } from '@/lib/api/appointments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatAppointmentDate } from '@/lib/utils';
import Link from 'next/link';

export default function BookingsPage() {
  const user = useUser();
  const { useUserAppointments } = useAppointments();
  
  const { data: appointments, isLoading, error } = useUserAppointments(user?.id ?? '');

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600">Error loading appointments. Please try again.</p>
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
      <h1 className="text-3xl font-bold mb-8">Your Appointments</h1>
      <div className="grid gap-6">
        {appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentWithRelations }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    declined: 'bg-red-100 text-red-800',
    in_progress: 'bg-purple-100 text-purple-800',
  };

  const statusColor = statusColors[appointment.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {appointment.pets?.name || 'Pet Name'}
            </CardTitle>
            <CardDescription>
              {formatAppointmentDate(appointment.date)}
            </CardDescription>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{appointment.time_slot}</span>
          </div>
          {appointment.address && (
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{appointment.address}</span>
            </div>
          )}
          {appointment.status === 'pending' && (
            <div className="flex justify-end">
              <Link href={`/book/payment?appointmentId=${appointment.id}`}>
                <Button>Complete Booking</Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}