"use client"

import { useState, useEffect } from "react"
import { Bell, DollarSign, MapPin, Check, X, Loader2 } from "lucide-react"
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
import { toast } from "@/components/ui/use-toast"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({})
  const supabase = useSupabaseClient()
  const user = useUser()

  // Debug logging
  console.log('Enhanced NotificationBell component loaded')

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
      
      console.log('🔍 Fetching notifications for user:', user.id);
      console.log('🔍 User role:', user.user_metadata?.role);
      
      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('🔍 Notifications query result:', notificationsData);
      console.log('🔍 Notifications query error:', notificationsError);
      
      if (!notificationsData || notificationsData.length === 0) {
        console.log('🔍 No notifications found');
        setNotifications([])
        return
      }
      
      // Fetch appointment details for each notification
      const appointmentIds = notificationsData
        .filter(n => n.appointment_id)
        .map(n => n.appointment_id)
      
      console.log('🔍 Appointment IDs to fetch:', appointmentIds);
      
      let appointmentsMap: Record<string, any> = {}
      
      if (appointmentIds.length > 0) {
        // Enhanced query to get all necessary data
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id, 
            total_price, 
            address, 
            date, 
            time_slot, 
            status,
            notes,
            pets:pet_id (
              id,
              name,
              type,
              breed
            ),
            pet_owner:pet_owner_id (
              id,
              first_name,
              last_name,
              email,
              phone
            ),
            services
          `)
          .in('id', appointmentIds)
        
        console.log('🔍 Appointments query result:', appointmentsData);
        console.log('🔍 Appointments query error:', appointmentsError);
        
        if (appointmentsData) {
          appointmentsMap = Object.fromEntries(
            appointmentsData.map(a => [a.id, a])
          )
        }
      }
      
      console.log('🔍 Final appointments map:', appointmentsMap);
      
      // Attach appointment details to notifications
      const notificationsWithDetails = notificationsData.map(n => ({
        ...n,
        appointment: n.appointment_id ? appointmentsMap[n.appointment_id] : null
      }))
      
      console.log('🔍 Final notifications with details:', notificationsWithDetails);
      setNotifications(notificationsWithDetails)
    }
    
    fetchNotificationsWithDetails()
  }, [dropdownOpen, user, supabase])

  const handleAcceptJob = async (appointmentId: string) => {
    setLoadingActions(prev => ({ ...prev, [appointmentId]: 'accept' }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          action: 'accept',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept job');
      }

      toast({
        title: "Success",
        description: "Job accepted successfully",
      });
      
      // Refresh notifications
      setDropdownOpen(false);
      setTimeout(() => setDropdownOpen(true), 100);
    } catch (error: any) {
      console.error("Error accepting job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept job",
        variant: "destructive",
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[appointmentId];
        return newState;
      });
    }
  };

  const handleDeclineJob = async (appointmentId: string) => {
    setLoadingActions(prev => ({ ...prev, [appointmentId]: 'decline' }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          action: 'decline',
          message: 'Vet declined the appointment',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline job');
      }

      toast({
        title: "Success",
        description: "Job declined successfully",
      });
      
      // Refresh notifications
      setDropdownOpen(false);
      setTimeout(() => setDropdownOpen(true), 100);
    } catch (error: any) {
      console.error("Error declining job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline job",
        variant: "destructive",
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[appointmentId];
        return newState;
      });
    }
  };

  const formatNotificationMessage = (notification: any) => {
    if (notification.appointment) {
      const petName = notification.appointment.pets?.name || 'Unknown Pet';
      const ownerName = notification.appointment.pet_owner 
        ? `${notification.appointment.pet_owner.first_name} ${notification.appointment.pet_owner.last_name}`
        : 'Unknown Owner';
      const date = notification.appointment.date 
        ? new Date(notification.appointment.date).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'No date';
      const time = notification.appointment.time_slot || 'No time';
      
      return `New appointment for ${petName} from ${ownerName}`;
    }
    return notification.message;
  };

  const formatNotificationDetails = (notification: any) => {
    if (notification.appointment) {
      const date = notification.appointment.date 
        ? new Date(notification.appointment.date).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'No date';
      const time = notification.appointment.time_slot || 'No time';
      
      return `${date} at ${time}`;
    }
    return '';
  };

  // Don't render if notifications are disabled
  if (!isEnabled || !user) {
    return null
  }

  return (
    <>
      {/* Temporary debug indicator */}
      <div style={{ 
        position: "absolute", 
        top: 0, 
        right: 0, 
        background: "red", 
        color: "white", 
        padding: "2px 4px", 
        fontSize: "10px", 
        zIndex: 9999,
        borderRadius: "2px"
      }}>
        ENHANCED BELL
      </div>
      
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
        <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="p-3 border-b last:border-b-0">
                <div className="space-y-2">
                  <div className="font-semibold text-sm">
                    {formatNotificationMessage(n)}
                  </div>
                  
                  {n.appointment && (
                    <>
                      <div className="text-xs text-gray-600">
                        {formatNotificationDetails(n)}
                      </div>
                      
                      {n.appointment.total_price && (
                        <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                          <DollarSign className="h-3 w-3" />
                          <span>${n.appointment.total_price}</span>
                        </div>
                      )}
                      
                      {n.appointment.address && (
                        <div className="flex items-start gap-1 text-gray-600 text-xs">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{n.appointment.address}</span>
                        </div>
                      )}
                      
                      {/* Quick actions for vets */}
                      {n.appointment && n.appointment.status === 'waiting_for_vet' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptJob(n.appointment_id)}
                            disabled={loadingActions[n.appointment_id] === 'accept'}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                          >
                            {loadingActions[n.appointment_id] === 'accept' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineJob(n.appointment_id)}
                            disabled={loadingActions[n.appointment_id] === 'decline'}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 h-7"
                          >
                            {loadingActions[n.appointment_id] === 'decline' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            Decline
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
} 