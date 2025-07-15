"use client"

import { useState, useEffect } from "react"
import { Bell, DollarSign, MapPin, Check, X, Loader2, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseClient, useUser } from "@/hooks/useSupabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  seen?: boolean;
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
  const [loadingActions, setLoadingActions] = useState<Record<string, 'accept' | 'decline' | 'view' | 'propose'>>({})
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [appointmentInfo, setAppointmentInfo] = useState<Record<string, any>>({});
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const { user } = useUser()
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

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

  // Fetch appointment info for notifications
  useEffect(() => {
    const fetchAppointmentInfo = async () => {
      const appointmentIds = notifications
        .filter(n => n.appointment_id)
        .map(n => n.appointment_id);
      
      if (appointmentIds.length === 0) return;
      
      console.log('Fetching appointment info for:', appointmentIds);
      
      const { data } = await supabase
        .from('appointments')
        .select('id, address, total_price')
        .in('id', appointmentIds);
      
      if (data) {
        const infoMap = data.reduce((acc, apt) => {
          acc[apt.id] = apt;
          return acc;
        }, {} as Record<string, any>);
        setAppointmentInfo(infoMap);
        console.log('Appointment info map:', infoMap);
      }
    };
    
    if (notifications.length > 0) {
      fetchAppointmentInfo();
    }
  }, [notifications, supabase]);

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

      // Add debugging to see what we're getting
      console.log('Raw notifications from RPC:', data);
      console.log('User data:', userData);
      
      // The RPC function already filters by role and type, so we don't need additional filtering
      // Just use the data as-is
      console.log('Using all notifications from RPC (no additional filtering):', data);
      setNotifications(data);
      // Check for unread notifications - remove the seen check since the column doesn't exist
      const unreadNotifications = data.filter((n: any) => !n.is_read && !n.read);
      console.log('Unread notifications:', unreadNotifications);
      setUnreadCount(unreadNotifications.length);
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
        description: "Job accepted successfully! You can view it in your ongoing appointments.",
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
        description: "Job declined successfully. You can still view it in available jobs if needed.",
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

  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return 'just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const formatNotificationMessage = (notification: any) => {
    // If we have appointment_details from the RPC
    if (notification.appointment_details) {
      const details = notification.appointment_details;
      return {
        title: notification.title || `New appointment for ${details.pet_name}`,
        message: notification.message || `From ${details.pet_owner_name} on ${details.date} at ${details.time_slot}`,
        time: notification.created_at
      };
    }
    
    // Fallback to basic notification data
    return {
      title: notification.title || 'New Appointment Request',
      message: notification.message || 'New appointment request',
      time: notification.created_at
    };
  };

  const handleNotificationClick = (notification: any) => {
    // Handle notification click - navigate to appointment details
    console.log('Notification clicked:', notification);
    
    if (notification.type === 'new_appointment' && notification.appointment_id) {
      // Mark as read
      markNotificationAsRead(notification.id);
      
      // Navigate to the bookings page with the specific appointment highlighted
      window.location.href = `/portal/bookings?tab=incoming&highlight=${notification.appointment_id}`;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewJobDetails = async (appointmentId: string, notificationId: string) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notificationId);
      
      // Navigate to the bookings page with the specific appointment highlighted
      router.push(`/portal/bookings?tab=incoming&highlight=${appointmentId}`);
      
      // Close the dropdown
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error viewing job details:', error);
      toast({
        title: "Error",
        description: "Failed to view job details",
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

  const handleProposeTime = async (appointmentId: string, notificationId: string) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notificationId);
      
      // Navigate to the bookings page with propose modal open
      router.push(`/portal/bookings?tab=incoming&propose=${appointmentId}`);
      
      // Close the dropdown
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error proposing time:', error);
      toast({
        title: "Error",
        description: "Failed to open propose time modal",
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

  const fetchAppointmentDetails = async (appointmentId: string) => {
    console.log('Fetching details for:', appointmentId);
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (name, species, breed),
          users!appointments_pet_owner_id_fkey (name, email, phone)
        `)
        .eq('id', appointmentId)
        .single();
      
      console.log('Appointment details:', data);
      
      if (error) throw error;
      
      setSelectedAppointment(data);
      setShowDetailsModal(true);
      setDropdownOpen(false);  // Close the dropdown when modal opens
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Don't render if notifications are disabled
  if (!isEnabled || !user) {
    return null;
  }

  return (
    <>
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
            {notifications.map((notification) => {
              // Add debugging for notification details
              console.log('Notification details:', {
                id: notification.id,
                type: notification.type,
                appointment_id: notification.appointment_id,
                message: notification.message,
                appointment_details: notification.appointment_details
              });
              
              const { title, message, time } = formatNotificationMessage(notification);
              const timeAgo = formatTimeAgo(time);
              
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 relative ${
                    !notification.read && !notification.is_read 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                      : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <Bell className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {message}
                      </p>
                      
                      {/* Add location and price if available */}
                      {(notification.appointment_id && appointmentInfo[notification.appointment_id]) && (
                        <div className="mt-2 space-y-1">
                          {appointmentInfo[notification.appointment_id].address && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointmentInfo[notification.appointment_id].address}
                            </p>
                          )}
                          <p className="text-xs font-medium text-gray-700">
                            Total: ${appointmentInfo[notification.appointment_id].total_price || 0}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo}
                      </p>
                    </div>
                  </div>
                  
                  {(() => {
                    // Add debugging here
                    console.log('Button check for notification:', {
                      notificationId: notification.id,
                      userRole: userData?.role,
                      notificationType: notification.type,
                      hasAppointmentId: !!notification.appointment_id,
                      appointmentId: notification.appointment_id,
                      shouldShowButtons: userData?.role === 'vet' && notification.type === 'new_appointment' && notification.appointment_id
                    });
                    return null;
                  })()}
                  
                  {/* Icon-only action buttons */}
                  {userData?.role === 'vet' && 
                   notification.appointment_id && (
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
                        disabled={!!loadingActions[notification.appointment_id || '']}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.appointment_id) {
                            const appointmentId = notification.appointment_id;
                            setLoadingActions(prev => ({ ...prev, [appointmentId]: 'accept' }));
                            handleAcceptJob(appointmentId);
                          }
                        }}
                        title="Accept Job"
                      >
                        {loadingActions[notification.appointment_id || ''] === 'accept' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
                        disabled={!!loadingActions[notification.appointment_id || '']}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.appointment_id) {
                            const appointmentId = notification.appointment_id;
                            setLoadingActions(prev => ({ ...prev, [appointmentId]: 'decline' }));
                            handleDeclineJob(appointmentId);
                          }
                        }}
                        title="Decline Job"
                      >
                        {loadingActions[notification.appointment_id || ''] === 'decline' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        className="p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors disabled:opacity-50"
                        disabled={!!loadingActions[notification.appointment_id || ''] || loadingDetails}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Eye icon clicked for appointment:', notification.appointment_id);
                          if (notification.appointment_id) {
                            fetchAppointmentDetails(notification.appointment_id);
                          }
                        }}
                        title="View Details"
                      >
                        {(loadingActions[notification.appointment_id || ''] === 'view' || loadingDetails) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        className="p-1.5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors disabled:opacity-50"
                        disabled={!!loadingActions[notification.appointment_id || '']}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.appointment_id) {
                            const appointmentId = notification.appointment_id;
                            setLoadingActions(prev => ({ ...prev, [appointmentId]: 'propose' }));
                            handleProposeTime(appointmentId, notification.id);
                          }
                        }}
                        title="Propose New Time"
                      >
                        {loadingActions[notification.appointment_id || ''] === 'propose' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {userData?.role === 'vet' && notification.type === 'new_appointment' && !notification.appointment_id && (
                    <div className="text-xs text-gray-500 italic mt-2">
                      No appointment record found
                    </div>
                  )}
                  
                  {!notification.read && !notification.is_read && (
                    <div className="absolute top-4 right-4 h-2 w-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              );
            })}
            
            {/* Add "View All Jobs" link for vets */}
            {userData?.role === 'vet' && notifications.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <Link 
                  href="/portal/bookings?tab=incoming"
                  className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => setDropdownOpen(false)}
                >
                  View All Available Jobs →
                </Link>
              </div>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Job Details Modal */}
    {showDetailsModal && selectedAppointment && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Appointment Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium">
                  {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time_slot}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Pet</p>
                <p className="font-medium">
                  {selectedAppointment.pets?.name || 'Unknown'} ({selectedAppointment.pets?.species})
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Owner</p>
                <p className="font-medium">
                  {selectedAppointment.users?.name || selectedAppointment.users?.email}
                </p>
                {selectedAppointment.users?.phone && (
                  <p className="text-sm text-gray-600">{selectedAppointment.users.phone}</p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{selectedAppointment.address || 'No address provided'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Services</p>
                {selectedAppointment.services?.map((service: any, index: number) => (
                  <p key={index} className="font-medium">
                    {service.name} - ${service.price}
                  </p>
                ))}
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-semibold text-lg">${selectedAppointment.total_price || 0}</p>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAcceptJob(selectedAppointment.id);
                  }}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                >
                  Accept Job
                </button>
                
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDeclineJob(selectedAppointment.id);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
                >
                  Decline
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleProposeTime(selectedAppointment.id, selectedAppointment.id);
                }}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
              >
                Propose New Time
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}