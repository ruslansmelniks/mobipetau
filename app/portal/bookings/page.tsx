"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@supabase/auth-helpers-react"
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Clock4, FileEdit } from "lucide-react"
import Link from "next/link"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Status badge component
const StatusBadge = ({ status, paymentStatus }: { status: string, paymentStatus?: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return paymentStatus === 'paid' 
          ? { label: 'Waiting for Vet', color: 'bg-yellow-100 text-yellow-800' }
          : { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
      case 'confirmed':
        return { label: 'Confirmed', color: 'bg-green-100 text-green-800' };
      case 'completed':
        return { label: 'Completed', color: 'bg-blue-100 text-blue-800' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const { label, color } = getStatusConfig();
  return (
    <Badge className={`${color} font-medium`}>
      {label}
    </Badge>
  );
};

export default function BookingsPage() {
  const router = useRouter();
  const user = useUser();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
      try {
        console.log('Fetching appointments for user:', user.id);
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            pets (
              id,
              name,
              type,
              breed
            )
          `)
          .eq('pet_owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching appointments:', error);
          throw error;
        }

        console.log('Fetched appointments:', data);
        setAppointments(data || []);
      } catch (err: any) {
        console.error('Failed to fetch appointments:', err);
        setError(err.message || 'Failed to load appointments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // Filter appointments
  const paidAppointments = appointments.filter(apt => {
    const isPaid = apt.status !== 'pending' || apt.stripe_payment_intent_id;
    console.log('Appointment filtering:', {
      id: apt.id,
      status: apt.status,
      paymentIntent: apt.stripe_payment_intent_id,
      isPaid
    });
    return isPaid;
  });

  const draftAppointments = appointments.filter(apt => {
    const isDraft = apt.status === 'pending' && !apt.stripe_payment_intent_id;
    console.log('Draft filtering:', {
      id: apt.id,
      status: apt.status,
      paymentIntent: apt.stripe_payment_intent_id,
      isDraft
    });
    return isDraft;
  });

  // Log summary of appointments
  useEffect(() => {
    if (appointments.length > 0) {
      console.log('Appointments summary:', {
        total: appointments.length,
        paid: paidAppointments.length,
        drafts: draftAppointments.length,
        statuses: appointments.reduce((acc, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    }
  }, [appointments, paidAppointments, draftAppointments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600">{error}</p>
          <Button
            className="mt-4"
            onClick={() => router.refresh()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-[1400px] px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <Button asChild>
            <Link href="/book">Book New Appointment</Link>
          </Button>
        </div>

        {/* Active Bookings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Bookings</h2>
          {paidAppointments.length === 0 ? (
            <p className="text-gray-600">No active bookings found.</p>
          ) : (
            <div className="grid gap-4">
              {paidAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {appointment.pets?.name || 'Pet'} - {appointment.services?.map((s: any) => s.name).join(', ')}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge 
                              status={appointment.status} 
                              paymentStatus={appointment.payment_status}
                            />
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{new Date(appointment.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{appointment.time_slot}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{appointment.address}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/portal/bookings/${appointment.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Draft Bookings */}
        {draftAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Draft Bookings</h2>
            <div className="grid gap-4">
              {draftAppointments.map((appointment) => (
                <Card key={appointment.id} className="bg-gray-50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {appointment.pets?.name || 'Pet'} - {appointment.services?.map((s: any) => s.name).join(', ')}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge 
                              status={appointment.status} 
                              paymentStatus={appointment.payment_status}
                            />
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {appointment.date && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {appointment.time_slot && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{appointment.time_slot}</span>
                        </div>
                      )}
                      {appointment.address && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{appointment.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/book/appointment?id=${appointment.id}`}>
                        Continue Booking
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}