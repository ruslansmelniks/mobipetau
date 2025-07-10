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
  is_read: boolean;
  read?: boolean;
  appointment_id?: string;
  appointment_details?: {
    id: string;
    date: string;
    time_slot: string;
    status: string;
    pet_owner_name: string;
    pet_name: string;
  };
  title?: string;
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
  const [userData, setUserData] = useState<any>(null);

  console.log('NotificationBell user object:', user);

  useEffect(() => {
    if (!user || !isEnabled) return

    const checkNotifications = async () => {
      try {
        // Query unread notifications using the 'read' column
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .or('is_read.eq.false,read.eq.false');

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

  // Updated userData fetch with better logging
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !user.id) return;
      
      console.log('NotificationBell fetching user data for:', user.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('NotificationBell user data result:', { data, error });
      
      if (data) {
        setUserData(data);
        // Also fetch notifications after user data is loaded
        if (dropdownOpen) {
          fetchNotifications();
        }
      }
    };
    
    fetchUserData();
  }, [user?.id, dropdownOpen]); // Add dropdownOpen to dependencies

  // Updated useEffect to call fetchNotifications when dropdown opens
  useEffect(() => {
    console.log('NotificationBell effect - userData changed:', userData);
    if (dropdownOpen && userData) {
      fetchNotifications();
    }
  }, [dropdownOpen, userData]);

  const fetchNotifications = async () => {
    console.log('fetchNotifications called with:', {
      sessionUserId: user?.id,
      userData: userData,
      userRole: userData?.role
    });

    if (!user?.id) {
      console.log('No session user ID');
      return;
    }

    setLoading(true);
    try {
      // Test function to bypass filtering temporarily
      const testFetch = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('read', false);
        
        console.log('Direct test fetch:', data);
        if (data) {
          setNotifications(data);
          return true;
        }
        return false;
      };

      // Try direct fetch first for testing
      const testResult = await testFetch();
      if (testResult) {
        console.log('Test fetch successful, showing all notifications');
        return;
      }

      // Don't wait for userData if we have a session
      const { data, error } = await supabase
        .rpc('fetchnotificationswithdetails', { 
          user_id_param: user.id 
        });

      console.log('RPC Response:', { data, error });

      if (error) {
        console.error('RPC Error:', error);
        return;
      }

      if (!data) {
        console.log('No data returned from RPC');
        return;
      }

      // If userData is not loaded yet, show all notifications
      if (!userData || !userData.role) {
        console.log('No userData/role yet, showing all notifications');
        setNotifications(data);
        return;
      }

      // Filter based on role
      const vetTypes = ['new_appointment', 'appointment_cancelled', 'time_proposal_response'];
      const ownerTypes = ['appointment_accepted', 'appointment_declined', 'time_proposed', 'appointment_completed'];
      
      const filtered = data.filter((notif: any) => {
        if (userData.role === 'vet') {
          return vetTypes.includes(notif.type);
        } else {
          return ownerTypes.includes(notif.type);
        }
      });

      console.log('Filtered notifications:', filtered);
      setNotifications(filtered);
      setUnreadCount(filtered.filter((n: any) => !n.is_read && !n.read).length);
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

  // Don't render if notifications are disabled
  if (!isEnabled || !user) {
    return null;
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
        >
          <span className="sr-only">View notifications</span>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center">
            <Bell className="mr-2 h-4 w-4 text-primary" />
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <div className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount}
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="p-4 text-center">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer"
              >
                <div className="flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{notification.title || formatNotificationMessage(notification)}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.appointment_details?.date || notification.created_at}
                    </p>
                  </div>
                </div>
                {notification.appointment_id && (
                  <div className="ml-auto flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcceptJob(notification.appointment_id as string)}
                      disabled={loadingActions[notification.appointment_id as string] === 'accept'}
                    >
                      {loadingActions[notification.appointment_id as string] === 'accept' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineJob(notification.appointment_id as string)}
                      disabled={loadingActions[notification.appointment_id as string] === 'decline'}
                    >
                      {loadingActions[notification.appointment_id as string] === 'decline' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Decline
                    </Button>
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}