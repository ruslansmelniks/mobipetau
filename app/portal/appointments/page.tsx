"use client"

import { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, User, FileText } from "lucide-react"
import { createClient } from '@/lib/supabase/client'

interface Appointment {
  id: string
  date: string
  time_slot: string
  status: string
  location?: string
  pets?: {
    name: string
    type: string
    breed?: string
  }
  vets?: {
    first_name: string
    last_name: string
  }
  services?: Array<{
    name: string
  }>
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        
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

        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            pets (*),
            vets (*)
          `)
          .eq('owner_id', user.id)
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

  const pendingAppointments = appointments.filter(app => 
    app.status === 'pending_approval' || app.status === 'waiting_for_vet'
  )
  
  const upcomingAppointments = appointments.filter(app => 
    app.status === 'confirmed' && new Date(app.date) > new Date()
  )
  
  const pastAppointments = appointments.filter(app => 
    app.status === 'completed' || app.status === 'cancelled' || new Date(app.date) < new Date()
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4e968f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#4e968f] hover:bg-[#43847e]"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Appointment with {appointment.pets?.name}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            appointment.status === 'pending_approval' || appointment.status === 'waiting_for_vet' ? 'bg-yellow-100 text-yellow-800' :
            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {appointment.status.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
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
              {appointment.services.map((service, index) => (
                <li key={index}>• {service.name}</li>
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
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Button
          className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
          asChild
        >
          <Link href="/book">Book New Appointment</Link>
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="flex-1">
            Pending Approval
            {pendingAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                {pendingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming Appointments
            {upcomingAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                {upcomingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            Past Appointments
            {pastAppointments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-100">
                {pastAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0">
          {pendingAppointments.length > 0 ? (
            <div className="grid gap-6">
              {pendingAppointments.map(renderAppointmentCard)}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No pending appointments</CardTitle>
                <CardDescription>
                  You don't have any appointments waiting for approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <Link href="/book">Book an appointment</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingAppointments.length > 0 ? (
            <div className="grid gap-6">
              {upcomingAppointments.map(renderAppointmentCard)}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No upcoming appointments</CardTitle>
                <CardDescription>
                  You don't have any confirmed appointments scheduled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <Link href="/book">Book an appointment</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          {pastAppointments.length > 0 ? (
            <div className="grid gap-6">
              {pastAppointments.map(renderAppointmentCard)}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No past appointments</CardTitle>
                <CardDescription>
                  You don't have any completed or cancelled appointments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <Link href="/book">Book an appointment</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 