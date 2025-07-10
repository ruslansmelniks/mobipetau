"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Calendar, Clock, MapPin, Check, X, Clock4, RefreshCw, Loader2, CalendarIcon, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useSupabaseClient } from "@/hooks/useSupabase"
import { getStatusLabel } from "@/lib/appointment-statuses"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { ErrorBoundary } from "@/components/error-boundary"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Job {
  id: string;
  date: string;
  time: string;
  status: string;
  total_price?: number;
  address?: string;
  pets: {
    name: string;
    type: string;
    breed?: string;
    image?: string;
  };
  pet_owner: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  created_at: string;
  location?: string;
  notes?: string;
  proposed_time?: string;
  proposed_message?: string;
}

// Time slot options
const timeSlots = [
  '06:00 - 08:00 AM',
  '08:00 - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 - 02:00 PM',
  '02:00 - 04:00 PM',
  '04:00 - 06:00 PM',
  '06:00 - 08:00 PM',
]

// UUID validation helper
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export default function VetJobsPage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({});
  const [proposedDates, setProposedDates] = useState<Record<string, Date>>({});
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({});
  const [proposedMessages, setProposedMessages] = useState<Record<string, string>>({});
  const [capturingPayment, setCapturingPayment] = useState<Record<string, boolean>>({});

  const fetchAvailableJobs = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setIsBackgroundRefreshing(true);
    }
    
    console.log('Starting to fetch available jobs...');
    
    try {
      // First try the view
      let { data: jobsData, error: jobsError } = await supabase
        .from("available_vet_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      
      console.log('View query response:', { jobsData, jobsError });
      
      // If view fails, try direct query as fallback
      if (jobsError) {
        console.warn("View 'available_vet_jobs' failed, trying direct query:", jobsError);
        
        // Fallback: Query appointments directly
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            *,
            pets:pet_id (
              id,
              name,
              type,
              breed,
              image
            ),
            pet_owner:pet_owner_id (
              id,
              email,
              first_name,
              last_name,
              phone
            )
          `)
          .eq("status", "waiting_for_vet")
          .order("created_at", { ascending: false });
        
        if (appointmentsError) {
          console.error("Direct query also failed:", appointmentsError);
          throw appointmentsError;
        }
        
        console.log('Direct query successful:', appointmentsData);
        jobsData = appointmentsData;
      }
      
      if (jobsData) {
        setJobs(jobsData);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsBackgroundRefreshing(false);
    }
  }, [supabase]);

  // Fetch all jobs for the vet (new, ongoing, past)
  const fetchAllJobs = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Fetch all appointments for this vet
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          pets:pet_id (
            id,
            name,
            type,
            breed,
            image
          ),
          pet_owner:pet_owner_id (
            id,
            email,
            first_name,
            last_name,
            phone
          )
        `)
        .or(`vet_id.eq.${user.id},status.eq.waiting_for_vet`)
        .order("created_at", { ascending: false });

      if (appointmentsError) {
        throw appointmentsError;
      }

      setJobs(appointmentsData || []);
    } catch (error) {
      console.error("Error fetching all jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      fetchAllJobs();
    }
  }, [user, fetchAllJobs]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments'
        }, 
        () => {
          fetchAllJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase, fetchAllJobs]);

  const handleAcceptJob = async (jobId: string) => {
    console.log('=== ACCEPT JOB START ===');
    console.log('Job ID:', jobId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session?.user?.id);
      
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          appointmentId: jobId,
          action: 'accept',
        }),
      });

      const result = await response.json();
      console.log('API Response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept job');
      }

      console.log('Job accepted successfully');
      
      // IMPORTANT: Refresh the jobs list
      await fetchAllJobs();
      
      toast({ title: 'Success', description: 'Job accepted successfully!', variant: 'default' });
    } catch (error) {
      console.error('Error accepting job:', error);
      toast({ title: 'Error', description: 'Failed to accept job', variant: 'destructive' });
    }
  };

  const handleDeclineJob = async (jobId: string, message?: string) => {
    setLoadingActions(prev => ({ ...prev, [jobId]: 'decline' }));
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
          appointmentId: jobId,
          action: 'decline',
          message: message || 'Vet declined the appointment',
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
      
      await fetchAllJobs();
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
        delete newState[jobId];
        return newState;
      });
    }
  };

  const handleProposeTime = async (jobId: string) => {
    const proposedDate = proposedDates[jobId];
    const proposedTime = proposedTimes[jobId];
    const message = proposedMessages[jobId];
    
    if (!proposedDate || !proposedTime) {
      toast({
        title: "Error",
        description: "Please select both a date and time",
        variant: "destructive",
      });
      return;
    }

    setLoadingActions(prev => ({ ...prev, [jobId]: 'propose' }));
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
          appointmentId: jobId,
          action: 'propose',
          proposedDate: proposedDate.toISOString(),
          proposedTime: proposedTime,
          message: message || `Vet proposed a new time: ${format(proposedDate, 'PPP')} at ${proposedTime}`,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to propose new time');
      }

      toast({
        title: "Success",
        description: "New time proposed successfully",
      });
      
      // Clear the input fields for this job
      setProposedDates(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
      setProposedTimes(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
      setProposedMessages(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
      
      await fetchAllJobs();
    } catch (error: any) {
      console.error("Error proposing new time:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to propose new time",
        variant: "destructive",
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
    }
  };

  const handleCapturePayment = async (jobId: string) => {
    setCapturingPayment(prev => ({ ...prev, [jobId]: true }));
    try {
      const response = await fetch('/api/capture-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: jobId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete appointment');
      }
      toast({ title: 'Success', description: 'Appointment completed and payment captured!', variant: 'default' });
      // Optionally refresh jobs list
      fetchAllJobs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to complete appointment', variant: 'destructive' });
    } finally {
      setCapturingPayment(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleCompleteJob = async (appointmentId: string) => {
    try {
      const response = await fetch('/api/capture-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete appointment');
      }

      toast({ title: 'Success', description: 'Appointment completed and payment captured!', variant: 'default' });
      fetchAllJobs();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({ title: 'Error', description: 'Failed to complete appointment', variant: 'destructive' });
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.pets?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.pet_owner?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.pet_owner?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Categorize jobs
  const newJobs = filteredJobs.filter(job => job.status === 'waiting_for_vet');
  const ongoingJobs = filteredJobs.filter(job => job.status === 'confirmed');
  const pastJobs = filteredJobs.filter(job => job.status === 'completed' || job.status === 'cancelled' || job.status === 'declined');

  const renderJobCard = (job: any, isAvailable: boolean = true) => {
    console.log('Vet JobCard - job data:', job);
    return (
      <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex gap-4">
          {job.pets?.image && (
            <div className="flex-shrink-0">
              <img
                src={job.pets.image}
                alt={job.pets.name || 'Pet'}
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {job.date ? format(new Date(job.date), 'EEEE, MMMM d, yyyy') : 'No date'}
                </h3>
                <p className="text-gray-600">{job.time_slot}</p>
              </div>
              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                {job.status === 'waiting_for_vet' ? 'Waiting for vet' : job.status}
              </span>
            </div>
            <div className="space-y-2">
              {job.pets && (
                <p className="text-gray-700">
                  <span className="font-medium">Pet:</span> {job.pets.name} ({job.pets.type})
                </p>
              )}
              {job.address && (
                <p className="text-gray-700">
                  <span className="font-medium">Location:</span> {job.address}
                </p>
              )}
              {job.services && (
                <div className="text-gray-700">
                  <span className="font-medium">Services:</span>
                  <ul className="ml-5 mt-1 list-disc">
                    {Array.isArray(job.services)
                      ? job.services.map((service: any, index: number) => (
                          <li key={index}>{service.name || service}</li>
                        ))
                      : <li>{String(job.services)}</li>
                    }
                  </ul>
                </div>
              )}
              {job.total_price && (
                <p className="text-gray-700">
                  <span className="font-medium">Total:</span> ${job.total_price}
                </p>
              )}
              {job.notes && (
                <p className="text-gray-700">
                  <span className="font-medium">Notes:</span> {job.notes}
                </p>
              )}
            </div>
            {/* Action Buttons Section */}
            {isAvailable && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAcceptJob(job.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors"
                >
                  Accept Job
                </button>
                <button
                  onClick={() => handleDeclineJob(job.id)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleProposeTime(job.id)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
                >
                  Propose New Time
                </button>
              </div>
            )}
            {/* For Ongoing Jobs - Add Complete Button */}
            {!isAvailable && job.status === 'confirmed' && (
              <button
                onClick={() => handleCompleteJob(job.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors mt-4"
              >
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Jobs</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <Button
              onClick={() => fetchAllJobs()}
              disabled={isBackgroundRefreshing}
              variant="outline"
              size="sm"
            >
              {isBackgroundRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="new" className="flex-1">
              New
              {newJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  {newJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="flex-1">
              Ongoing
              {ongoingJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                  {ongoingJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Past
              {pastJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-100">
                  {pastJobs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0 space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            ) : newJobs.length > 0 ? (
              newJobs.map(job => renderJobCard(job, true))
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No new jobs available</h2>
                <p className="text-gray-600 mb-6">There are no new appointments waiting for a vet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="mt-0 space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            ) : ongoingJobs.length > 0 ? (
              ongoingJobs.map(job => renderJobCard(job, false))
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No ongoing jobs</h2>
                <p className="text-gray-600 mb-6">You don't have any jobs currently in progress.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0 space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            ) : pastJobs.length > 0 ? (
              pastJobs.map(job => renderJobCard(job, false))
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No past jobs</h2>
                <p className="text-gray-600 mb-6">You don't have any past jobs.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
} 