"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    if (!user || !isEnabled) return

    const checkNotifications = async () => {
      try {
        // Try with is_read first
        let { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        // If error, try with 'read' column
        if (error && error.message.includes('column')) {
          console.log('Trying alternative column name...');
          const result = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false)
          
          count = result.count
          error = result.error
        }

        if (error) {
          console.log('Notifications not available:', error.message)
          setIsEnabled(false)
          return
        }

        setUnreadCount(count || 0)
      } catch (err) {
        console.log('Error checking notifications:', err)
        setIsEnabled(false)
      }
    }

    checkNotifications()

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          checkNotifications()
        }
      )
      .subscribe()

    // Poll every 30 seconds as backup
    const interval = setInterval(checkNotifications, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [user, supabase, isEnabled])

  // Fetch notifications and appointment details when dropdown opens
  useEffect(() => {
    const fetchNotificationsWithDetails = async () => {
      if (!dropdownOpen || !user) return;
      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      console.log('DEBUG: notificationsData', notificationsData)
      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([])
        return
      }
      // Fetch appointment details for each notification
      const appointmentIds = notificationsData
        .filter(n => n.appointment_id)
        .map(n => n.appointment_id)
      console.log('DEBUG: appointmentIds', appointmentIds)
      let appointmentsMap: Record<string, any> = {}
      if (appointmentIds.length > 0) {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('id, total_price, address')
          .in('id', appointmentIds)
        console.log('DEBUG: appointmentsData', appointmentsData)
        if (appointmentsData) {
          appointmentsMap = Object.fromEntries(
            appointmentsData.map(a => [a.id, a])
          )
        }
      }
      console.log('DEBUG: appointmentsMap', appointmentsMap)
      // Attach appointment details to notifications
      const notificationsWithDetails = notificationsData.map(n => ({
        ...n,
        appointment: n.appointment_id ? appointmentsMap[n.appointment_id] : null
      }))
      console.log('DEBUG: notificationsWithDetails', notificationsWithDetails)
      setNotifications(notificationsWithDetails)
    }
    fetchNotificationsWithDetails()
  }, [dropdownOpen, user, supabase])

  // Don't render if notifications are disabled
  if (!isEnabled || !user) {
    return null
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          notifications.map(n => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start whitespace-normal py-3 px-2">
              <span className="font-semibold text-base mb-1">{n.message}</span>
              <span className="text-xs text-gray-500 mb-1">{new Date(n.created_at).toLocaleString()}</span>
              {n.appointment && (
                <>
                  <span className="text-sm text-gray-700 mb-0.5"><b>Total:</b> ${n.appointment.total_price ?? 'N/A'}</span>
                  <span className="text-sm text-gray-700"><b>Address:</b> {n.appointment.address ?? 'N/A'}</span>
                </>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 