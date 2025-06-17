"use client"

import { useEffect, useState } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, User } from "lucide-react"
import { createClient } from '@/lib/supabase/client'

export default function AppointmentsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const supabase = createClient()
        
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Authentication error. Please log in again.')
          router.push('/login')
          return
        }

        if (!session) {
          console.log('No active session found')
          router.push('/login')
          return
        }

        // Get user data
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('User error:', userError)
          setError('Failed to get user information')
          return
        }

        if (!user) {
          console.log('No user found')
          router.push('/login')
          return
        }

        setUser(user)

        // Get user's appointments with proper error handling
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            time_slot,
            status,
            services,
            pet_id,
            vet_id,
            pets:pet_id (
              id,
              name,
              type,
              breed
            ),
            vets:vet_id (
              id,
              first_name,
              last_name
            )
          `)
          .eq('pet_owner_id', user.id)
          .order('date', { ascending: true })

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError)
          setError('Failed to load appointments. Please try again later.')
          return
        }

        if (!appointmentsData) {
          console.log('No appointments found for user:', user.id)
          setAppointments([])
          return
        }

        setAppointments(appointmentsData)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Unable to Load Appointments</h2>
        <p className="mb-6 text-gray-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Button
          className="bg-[#4e968f] hover:bg-[#43847e]"
          asChild
        >
          <Link href="/book">Book New Appointment</Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Appointment with {appointment.pets?.name}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </CardTitle>
                <CardDescription>
                  {appointment.pets?.type} {appointment.pets?.breed && `• ${appointment.pets.breed}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-gray-600">
                      {new Date(appointment.date).toLocaleDateString()} • {appointment.time_slot}
                    </p>
                  </div>
                </div>

                {appointment.vets && (
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">Veterinarian</p>
                      <p className="text-gray-600">
                        Dr. {appointment.vets.first_name} {appointment.vets.last_name}
                      </p>
                    </div>
                  </div>
                )}

                {appointment.location && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600">{appointment.location}</p>
                    </div>
                  </div>
                )}

                {appointment.services && appointment.services.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Services</p>
                    <ul className="text-gray-600 text-sm space-y-1">
                      {appointment.services.map((service: any, index: number) => (
                        <li key={index}>• {service.name || service}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button variant="outline" asChild>
                  <Link href={`/portal/appointments/${appointment.id}`}>View Details</Link>
                </Button>
                <div className="flex gap-3">
                  {appointment.status === 'confirmed' && (
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Cancel appointment
                    </Button>
                  )}
                  <Button className="bg-[#4e968f] hover:bg-[#43847e]">
                    Contact support
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No appointments yet</CardTitle>
              <CardDescription>
                You don't have any appointments scheduled. Book an appointment to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-[#4e968f] hover:bg-[#43847e]" asChild>
                <Link href="/book">Book an appointment</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 