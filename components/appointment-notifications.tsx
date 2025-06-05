"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { CheckCircle, Clock, X } from "lucide-react"

export function AppointmentNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    if (!user) return

    let mounted = true

    const checkNotifications = async () => {
      try {
        // Get recent appointment status changes
        const { data } = await supabase
          .from('appointments')
          .select(`
            *,
            vet:vet_id (first_name, last_name),
            pets (name)
          `)
          .eq('pet_owner_id', user.id)
          .in('status', ['confirmed', 'time_proposed'])
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order('updated_at', { ascending: false })

        if (mounted && data) {
          setNotifications(data)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    checkNotifications()

    // Set up real-time subscription
    const channel = supabase.channel('appointment-updates')
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `pet_owner_id=eq.${user.id}`,
        },
        () => {
          if (mounted) {
            checkNotifications()
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [user?.id, supabase])

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {notifications.map((notification) => (
        <Alert key={notification.id} className="relative">
          <div className="flex items-start">
            {notification.status === 'confirmed' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
            )}
            <div className="flex-1">
              <AlertTitle>
                {notification.status === 'confirmed' 
                  ? 'Appointment Confirmed!'
                  : 'New Time Proposed'}
              </AlertTitle>
              <AlertDescription>
                {notification.status === 'confirmed' ? (
                  <>
                    Dr. {notification.vet?.first_name} {notification.vet?.last_name} has 
                    accepted your appointment for {notification.pets?.name}
                  </>
                ) : (
                  <>
                    Dr. {notification.vet?.first_name} {notification.vet?.last_name} has 
                    proposed a new time: {notification.proposed_date} at {notification.proposed_time}
                  </>
                )}
              </AlertDescription>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      ))}
    </div>
  )
} 