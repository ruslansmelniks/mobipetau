"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Calendar, Clock, MapPin, Check, X, Clock4, RefreshCw, Loader2, CalendarIcon, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
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
  const user = useUser();
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
    setLoadingActions(prev => ({ ...prev, [jobId]: 'accept' }));
    try {
      // Get the session to have the auth token
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
      
      await fetchAllJobs();
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
        delete newState[jobId];
        return newState;
      });
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
  const ongoingJobs = filteredJobs.filter(job => 
    job.status === 'confirmed' || job.status === 'in_progress' || job.status === 'time_proposed'
  );
  const pastJobs = filteredJobs.filter(job => 
    job.status === 'completed' || job.status === 'cancelled' || job.status === 'declined'
  );

  const renderJobCard = (job: Job) => {
    const statusInfo = getStatusLabel(job.status);
    const isPending = job.status === 'waiting_for_vet';
    const isOngoing = job.status === 'confirmed' || job.status === 'in_progress' || job.status === 'time_proposed';
    const isPast = job.status === 'completed' || job.status === 'cancelled' || job.status === 'declined';

    return (
      <div key={job.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {job.pets?.image ? (
                <Image
                  src={job.pets.image}
                  alt={job.pets.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-lg">
                    {job.pets?.name?.charAt(0) || 'P'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {job.pets?.name || 'Unknown Pet'}
                </h3>
                <p className="text-gray-600">
                  {job.pet_owner?.first_name} {job.pet_owner?.last_name}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {job.total_price && (
                <div className="flex items-center gap-1 text-green-600 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span>${job.total_price}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 text-teal-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-700">Appointment Details</h3>
            </div>
            <div className="ml-7 space-y-1">
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {job.date ? format(new Date(job.date), "EEEE, MMMM d, yyyy") : "No date specified"}
              </p>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                {job.time || "No time specified"}
              </p>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {job.address || job.location || "No location specified"}
              </p>
            </div>
          </div>

          {/* Pet Owner Information */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 text-teal-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-700">Pet Owner Information</h3>
            </div>
            <div className="ml-7 space-y-1">
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {job.pet_owner?.email}
              </p>
              {job.pet_owner?.phone && (
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  {job.pet_owner.phone}
                </p>
              )}
            </div>
          </div>
          
          {job.notes && (
            <div className="px-6 pb-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-medium text-gray-700 mb-1">Issue Description:</p>
                <p className="text-gray-600">{job.notes}</p>
              </div>
            </div>
          )}
          
          {job.status === 'time_proposed' && job.proposed_time && (
            <div className="px-6 pb-4">
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <p className="font-medium text-yellow-800 mb-1">Proposed Time:</p>
                <p className="text-yellow-700">{job.proposed_time}</p>
                {job.proposed_message && (
                  <p className="text-yellow-600 text-sm mt-1">{job.proposed_message}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="p-6 bg-gray-50 border-t">
            {isPending ? (
              <>
                {/* Propose time inputs */}
                <div className="mb-4 space-y-3">
                  <div>
                    <Label htmlFor={`date-${job.id}`} className="text-sm font-medium">
                      Propose a different date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !proposedDates[job.id] && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {proposedDates[job.id] ? format(proposedDates[job.id], "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={proposedDates[job.id]}
                          onSelect={(date) => setProposedDates(prev => ({ ...prev, [job.id]: date! }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor={`time-${job.id}`} className="text-sm font-medium">
                      Propose a different time
                    </Label>
                    <Select
                      value={proposedTimes[job.id] || ""}
                      onValueChange={(value) => setProposedTimes(prev => ({ ...prev, [job.id]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00 - 08:00 AM">06:00 - 08:00 AM</SelectItem>
                        <SelectItem value="08:00 - 10:00 AM">08:00 - 10:00 AM</SelectItem>
                        <SelectItem value="10:00 - 12:00 PM">10:00 - 12:00 PM</SelectItem>
                        <SelectItem value="12:00 - 02:00 PM">12:00 - 02:00 PM</SelectItem>
                        <SelectItem value="02:00 - 04:00 PM">02:00 - 04:00 PM</SelectItem>
                        <SelectItem value="04:00 - 06:00 PM">04:00 - 06:00 PM</SelectItem>
                        <SelectItem value="06:00 - 08:00 PM">06:00 - 08:00 PM</SelectItem>
                        <SelectItem value="08:00 - 10:00 PM">08:00 - 10:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`message-${job.id}`} className="text-sm font-medium">
                      Message (optional)
                    </Label>
                    <Textarea
                      id={`message-${job.id}`}
                      placeholder="Add a message explaining the time change..."
                      value={proposedMessages[job.id] || ""}
                      onChange={(e) => setProposedMessages(prev => ({ ...prev, [job.id]: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleAcceptJob(job.id)}
                    disabled={loadingActions[job.id] === 'accept'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loadingActions[job.id] === 'accept' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Accept Job
                  </Button>
                  
                  <Button
                    onClick={() => handleDeclineJob(job.id)}
                    disabled={loadingActions[job.id] === 'decline'}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {loadingActions[job.id] === 'decline' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Decline
                  </Button>
                  
                  {(proposedDates[job.id] || proposedTimes[job.id]) && (
                    <Button
                      onClick={() => handleProposeTime(job.id)}
                      disabled={loadingActions[job.id] === 'propose'}
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {loadingActions[job.id] === 'propose' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock4 className="h-4 w-4" />
                      )}
                      Propose Time
                    </Button>
                  )}
                </div>
              </>
            ) : isOngoing ? (
              <div className="text-center">
                <p className="text-gray-600 mb-3">This job is currently in progress</p>
                <Button 
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <a href={`/vet/appointments/${job.id}`}>
                    View Details
                  </a>
                </Button>
              </div>
            ) : (
              <div className="text-center text-gray-600">
                {isPast ? 'This job has been completed' : 'This job is no longer available'}
              </div>
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
              newJobs.map(renderJobCard)
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
              ongoingJobs.map(renderJobCard)
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
              pastJobs.map(renderJobCard)
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No past jobs</h2>
                <p className="text-gray-600 mb-6">You don't have any completed or cancelled jobs.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
} 