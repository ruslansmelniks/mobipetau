"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@supabase/auth-helpers-react"
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin } from "lucide-react"
import Link from "next/link"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'waiting_for_vet':
        return { label: 'Waiting for Vet', color: 'bg-yellow-100 text-yellow-800' };
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
          .neq('status', 'pending') // Exclude draft appointments
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold mb-8 text-left">My Bookings</h1>
        <div className="mb-8 w-full">
          <h2 className="text-xl font-semibold mb-4">Active Bookings</h2>
          {appointments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-600 mb-4">No active bookings found.</p>
                <p className="text-gray-500 mb-6">Book your first appointment to get started.</p>
                <Link href="/book" className="text-teal-700 hover:underline font-medium">Book New Appointment</Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {appointment.pets?.name || 'Pet'} - {appointment.services?.map((s: any) => s.name).join(', ')}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={appointment.status} />
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
      </main>
    </div>
  );
}