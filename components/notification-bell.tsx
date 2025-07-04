"use client"

import { useState, useEffect } from "react"
import { Bell, DollarSign, MapPin, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseClient, useUser } from "@/hooks/useSupabase"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface AppointmentService {
  id: string;
  service_id: string;
  price: number;
  services: Service;
}

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
}

interface PetOwner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface AppointmentData {
  id: string;
  total_price: number;
  address: string;
  date: string;
  time_slot: string;
  status: string;
  notes: string;
  created_at: string;
  pet_id: string;
  pet_owner_id: string;
  pets: Pet;
  pet_owner: PetOwner;
  services?: { name: string; price: number; }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;  // Changed from seen
  appointment_id?: string;
  appointment_details?: {  // Changed from appointment
    id: string;
    date: string;
    time_slot: string;
    status: string;
    pet_owner_name: string;
    pet_name: string;
  };
  title?: string;  // Add this since it exists in the table
}

interface DatabaseAppointment {
  id: string;
  total_price: number;
  address: string;
  date: string;
  time_slot: string;
  status: string;
  notes: string;
  created_at: string;
  pet_id: string;
  pet_owner_id: string;
  pets: {
    id: string;
    name: string;
    type: string;
    breed: string;
  };
  pet_owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface DatabaseService {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface DatabaseAppointmentService {
  id: string;
  service_id: string;
  price: number;
  services: DatabaseService;
}

export function NotificationBell() {
  // ALL HOOKS MUST BE AT THE TOP, BEFORE ANY CONDITIONS
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    if (!user || !isEnabled) return

    const checkNotifications = async () => {
      try {
        // Query unread notifications using the 'read' column
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)

        if (error) {
          console.error('Notifications check error:', error)
          // Don't disable notifications for RLS errors, just set count to 0
          if (error.code === '42501' || error.code === 'PGRST116') {
            setUnreadCount(0)
            return
          }
          setIsEnabled(false)
          return
        }

        setUnreadCount(count || 0)
      } catch (err) {
        console.error('Notifications check exception:', err)
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

  const fetchNotifications = async () => {
    console.log('fetchNotifications called, user:', user);
    if (!user) return;
    
    setLoading(true);
    try {
      // First try the RPC function
      console.log('Calling RPC with user_id:', user.id);
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('fetchnotificationswithdetails', { 
          user_id_param: user.id 
        });
      
      console.log('RPC response:', { rpcData, rpcError });
      
      if (!rpcError && rpcData) {
        // Use RPC data directly
        console.log('Setting notifications:', rpcData);
        console.log('Notifications is_read values:', rpcData.map((n: any) => ({ id: n.id, is_read: n.is_read })));
        setNotifications(rpcData);
        setUnreadCount(rpcData.filter(n => !n.is_read).length);
      } else {
        console.error('RPC failed:', rpcError);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

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
    if (notification.appointment_details) {
      const petName = notification.appointment_details.pet_name || 'Unknown Pet';
      const ownerName = notification.appointment_details.pet_owner_name || 'Unknown Owner';
      const date = notification.appointment_details.date 
        ? new Date(notification.appointment_details.date).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'No date';
      const time = notification.appointment_details.time_slot || 'No time';
      
      return `New appointment for ${petName} from ${ownerName}`;
    }
    return notification.message;
  };

  const formatNotificationDetails = (notification: any) => {
    if (notification.appointment_details) {
      const date = notification.appointment_details.date 
        ? new Date(notification.appointment_details.date).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          })
        : 'No date';
      const time = notification.appointment_details.time_slot || 'No time';
      
      return `${date} at ${time}`;
    }
    return '';
  };

  // Don't render if notifications are disabled
  if (!isEnabled || !user) {
    return null
  }

  console.log('Rendering NotificationBell, notifications:', notifications);
  console.log('Loading state:', loading);

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
                    {n.message}
                  </div>
                  
                  {n.appointment_details && (
                    <>
                      <div className="text-xs text-gray-600">
                        {n.appointment_details.date ? new Date(n.appointment_details.date).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'No date'} at {n.appointment_details.time_slot || 'No time'}
                      </div>
                      
                      {/* Quick actions for vets */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptJob(n.appointment_details!.id)}
                          disabled={loadingActions[n.appointment_details!.id] === 'accept'}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                        >
                          {loadingActions[n.appointment_details!.id] === 'accept' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineJob(n.appointment_details!.id)}
                          disabled={loadingActions[n.appointment_details!.id] === 'decline'}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 h-7"
                        >
                          {loadingActions[n.appointment_details!.id] === 'decline' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          Decline
                        </Button>
                      </div>
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