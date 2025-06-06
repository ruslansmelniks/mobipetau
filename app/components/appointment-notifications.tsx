"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Clock, X, XCircle } from "lucide-react"
import { format } from "date-fns"
import { useNotificationSound } from "@/hooks/useNotificationSound"

interface Notification {
  id: string
  status: string
  petName?: string
  vetName?: string
  date?: string
  time_slot?: string
  proposed_date?: string
  proposed_time?: string
  proposed_message?: string
  updated_at: string
}

interface AppointmentData {
  id: string
  status: string
  date?: string
  time_slot?: string
  proposed_date?: string
  proposed_time?: string
  proposed_message?: string
  updated_at: string
  pets: {
    name: string
  }
  vet: {
    first_name: string
    last_name: string
  } | null
}

export function AppointmentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const supabase = useSupabaseClient()
  const user = useUser()
  const { playNotification } = useNotificationSound()

  useEffect(() => {
    if (!user) return

    const checkNotifications = async () => {
      try {
        // Get appointments that have been updated in the last 24 hours
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            status,
            date,
            time_slot,
            proposed_date,
            proposed_time,
            proposed_message,
            updated_at,
            pets!inner(name),
            vet:vet_id(first_name, last_name)
          `)
          .eq('pet_owner_id', user.id)
          .in('status', ['confirmed', 'time_proposed', 'declined'])
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('Error fetching notifications:', error)
          return
        }

        if (data) {
          // Transform the data
          const transformedNotifications = data.map(item => ({
            id: item.id,
            status: item.status,
            petName: item.pets?.[0]?.name,
            vetName: item.vet?.[0] ? `${item.vet[0].first_name} ${item.vet[0].last_name}` : undefined,
            date: item.date,
            time_slot: item.time_slot,
            proposed_date: item.proposed_date,
            proposed_time: item.proposed_time,
            proposed_message: item.proposed_message,
            updated_at: item.updated_at
          }))
          
          const newNotifications = transformedNotifications.filter(n => !dismissed.has(n.id))
          
          // Play sound if there are new notifications
          if (newNotifications.length > notifications.length) {
            playNotification()
          }
          
          setNotifications(newNotifications)
        }
      } catch (error) {
        console.error('Error in checkNotifications:', error)
      }
    }

    // Initial check
    checkNotifications()

    // Set up real-time subscription
    const channel = supabase
      .channel(`appointment-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `pet_owner_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Appointment update received:', payload)
          // Check if the update is a status change we care about
          const newStatus = payload.new?.status
          if (newStatus && ['confirmed', 'time_proposed', 'declined'].includes(newStatus)) {
            checkNotifications()
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    // Check every 30 seconds as a fallback
    const interval = setInterval(checkNotifications, 30000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [user, supabase, dismissed, notifications.length, playNotification])

  const dismissNotification = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
    setNotifications(notifications.filter(n => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {notifications.map((notification) => (
        <Alert 
          key={notification.id} 
          className={`relative ${
            notification.status === 'confirmed' 
              ? 'border-green-200 bg-green-50' 
              : notification.status === 'declined'
              ? 'border-red-200 bg-red-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <div className="flex items-start">
            {notification.status === 'confirmed' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
            ) : notification.status === 'declined' ? (
              <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            )}
            <div className="flex-1">
              <AlertTitle className="text-sm font-semibold">
                {notification.status === 'confirmed' 
                  ? 'Appointment Confirmed!'
                  : notification.status === 'declined'
                  ? 'Appointment Declined'
                  : 'New Time Proposed'}
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {notification.status === 'confirmed' ? (
                  <>
                    {notification.vetName 
                      ? `Dr. ${notification.vetName} has accepted your appointment for ${notification.petName}.`
                      : `Your appointment for ${notification.petName} has been confirmed.`}
                    {notification.date && notification.time_slot && (
                      <span className="block mt-1 text-xs">
                        Scheduled for {format(new Date(notification.date), 'MMM d, yyyy')} at {notification.time_slot}
                      </span>
                    )}
                  </>
                ) : notification.status === 'declined' ? (
                  <>
                    {notification.vetName 
                      ? `Dr. ${notification.vetName} has declined your appointment for ${notification.petName}.`
                      : `Your appointment for ${notification.petName} has been declined.`}
                    <span className="block mt-1 text-xs">
                      Please book a new appointment or try a different time.
                    </span>
                  </>
                ) : (
                  <>
                    {notification.vetName 
                      ? `Dr. ${notification.vetName} has proposed a new time for ${notification.petName}'s appointment.`
                      : `A new time has been proposed for ${notification.petName}'s appointment.`}
                    {notification.proposed_date && notification.proposed_time && (
                      <span className="block mt-1 text-xs font-medium">
                        New time: {format(new Date(notification.proposed_date), 'MMM d, yyyy')} at {notification.proposed_time}
                      </span>
                    )}
                    {notification.proposed_message && (
                      <span className="block mt-1 text-xs italic">
                        "{notification.proposed_message}"
                      </span>
                    )}
                  </>
                )}
              </AlertDescription>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      ))}
    </div>
  )
} 