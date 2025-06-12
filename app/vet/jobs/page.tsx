"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Calendar, Clock, MapPin, Check, X, Clock4, RefreshCw, Loader2, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [proposedDates, setProposedDates] = useState<Record<string, Date | undefined>>({})
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({})
  const [proposedMessages, setProposedMessages] = useState<Record<string, string>>({})
  const [newJobCount, setNewJobCount] = useState(0)
  const [previousJobIds, setPreviousJobIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'proposed'>('all')
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({})
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false)
  const [actualNewJobsCount, setActualNewJobsCount] = useState(0)
  const user = useUser()
  const supabase = useSupabaseClient()

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
      
      // Transform the data
      const jobsWithDetails = (jobsData || []).map(job => {
        // Handle both view format and direct query format
        if (job.pets && typeof job.pets === 'object' && !Array.isArray(job.pets)) {
          // Direct query format - already has nested objects
          return job;
        } else {
          // View format - needs transformation
          return {
            ...job,
            pets: {
              name: job.pet_name || "Unknown Pet",
              type: job.pet_type || "Pet",
              breed: job.pet_breed,
              image: job.pet_image
            },
            pet_owner: {
              first_name: job.owner_first_name || "Unknown",
              last_name: job.owner_last_name || "Owner",
              email: job.owner_email,
              phone: job.owner_phone
            }
          };
        }
      });
      
      console.log('Transformed jobs:', jobsWithDetails);
      setJobs(jobsWithDetails);
      
      // Initialize proposed dates with the requested dates
      const newProposedDates: Record<string, Date | undefined> = {};
      jobsWithDetails.forEach(job => {
        if (job.date && !proposedDates[job.id]) {
          newProposedDates[job.id] = new Date(job.date);
        }
      });
      setProposedDates(prev => ({ ...prev, ...newProposedDates }));
      
      // Check for new jobs notification logic
      const currentJobIds = new Set(jobsWithDetails.map(job => job.id));
      let newCount = 0;
      currentJobIds.forEach(id => {
        if (!previousJobIds.has(id)) {
          newCount++;
        }
      });
      
      if (newCount > 0 && previousJobIds.size > 0) {
        toast({
          title: "New Job Available!",
          description: `${newCount} new ${newCount === 1 ? 'job' : 'jobs'} available`,
        });
      }
      
      setPreviousJobIds(currentJobIds);
      setNewJobCount(newCount);
      
    } catch (err: any) {
      console.error("Error in fetchAvailableJobs:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to load jobs. Please refresh the page.",
        variant: "destructive",
      });
      setJobs([]);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  }, [supabase, previousJobIds, proposedDates]);

  // Add loading timeout effect
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.error('Loading timeout - forcing completion');
        setLoading(false);
        toast({
          title: "Loading Timeout",
          description: "Failed to load jobs. Please refresh the page.",
          variant: "destructive",
        });
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  // Initial fetch effect
  useEffect(() => {
    if (!user) return;
    
    // Only fetch once initially
    if (!hasFetchedInitially) {
      setHasFetchedInitially(true);
      fetchAvailableJobs();
    }
  }, [user, hasFetchedInitially, fetchAvailableJobs]);

  // Auto-refresh effect
  useEffect(() => {
    if (!user || !autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      if (!loading) {
        fetchAvailableJobs(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, autoRefreshEnabled, loading, fetchAvailableJobs]);

  // Update the useEffect that calls fetchAvailableJobs to also track views
  useEffect(() => {
    if (jobs.length > 0 && user) {
      // Track that the vet has viewed these jobs
      const jobIds = jobs.map(job => job.id)
      trackViewedJobs(jobIds)
      getNewJobsCount()
    }
  }, [jobs, user])

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
      
      await fetchAvailableJobs();
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
      
      await fetchAvailableJobs();
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
      
      await fetchAvailableJobs();
    } catch (error: any) {
      console.error("Error proposing time:", error);
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

  // Filter jobs before rendering
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = 
        job.pets.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pet_owner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pet_owner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pet_owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pet_owner.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pets.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pets.breed?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'new') return matchesSearch && !previousJobIds.has(job.id);
      if (statusFilter === 'proposed') return matchesSearch && job.status === 'time_proposed';
      return matchesSearch;
    })
    .sort((a, b) => {
      // First sort by status - waiting_for_vet jobs first
      if (a.status === 'waiting_for_vet' && b.status !== 'waiting_for_vet') return -1;
      if (a.status !== 'waiting_for_vet' && b.status === 'waiting_for_vet') return 1;
      
      // Then sort by created_at date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const renderJobCard = (job: any) => {
    const status = getStatusLabel(job.status);
    const isLoading = !!loadingActions[job.id];
    const loadingAction = loadingActions[job.id];
    
    return (
      <div key={job.id} className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
            {job.pets?.image ? (
              <Image
                src={job.pets.image}
                alt={job.pets.name || "Pet"}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xs">No img</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{job.pets?.name || "Unknown Pet"}</h2>
            <p className="text-gray-600 truncate">{job.pets?.type || "Pet"}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
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
              {job.location || "No location specified"}
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
            <h3 className="font-medium text-gray-700">Pet Owner</h3>
          </div>
          <div className="ml-7 space-y-1">
            <p className="text-gray-900 font-medium">
              {job.pet_owner?.first_name || "Unknown"} {job.pet_owner?.last_name || "Owner"}
            </p>
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {job.pet_owner?.email || "No email"}
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
          {job.status === 'time_proposed' ? (
            <div className="text-center text-gray-600">
              Waiting for pet owner's response to the proposed time...
            </div>
          ) : job.status === 'confirmed' || job.status === 'cancelled' ? (
            <div className="text-center text-gray-600">
              {job.status === 'confirmed' 
                ? 'This appointment has been confirmed and cannot be modified.'
                : 'This appointment has been declined and cannot be modified.'}
            </div>
          ) : (
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
                        id={`date-${job.id}`}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !proposedDates[job.id] && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {proposedDates[job.id] ? format(proposedDates[job.id]!, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={proposedDates[job.id]}
                        onSelect={(date) => setProposedDates(prev => ({ ...prev, [job.id]: date }))}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor={`time-${job.id}`} className="text-sm font-medium">
                    Select time slot
                  </Label>
                  <Select
                    value={proposedTimes[job.id] || ""}
                    onValueChange={(value) => setProposedTimes(prev => ({ ...prev, [job.id]: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger id={`time-${job.id}`} className="mt-1">
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor={`message-${job.id}`} className="text-sm font-medium">
                    Message (optional)
                  </Label>
                  <Textarea
                    id={`message-${job.id}`}
                    placeholder="Add a message for the pet owner..."
                    value={proposedMessages[job.id] || ""}
                    onChange={(e) => setProposedMessages(prev => ({ 
                      ...prev, 
                      [job.id]: e.target.value 
                    }))}
                    disabled={isLoading}
                    className="mt-1 h-20"
                  />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-end">
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                  onClick={() => handleDeclineJob(job.id)}
                  disabled={isLoading}
                >
                  {loadingAction === 'decline' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                  onClick={() => handleProposeTime(job.id)}
                  disabled={isLoading || !proposedDates[job.id] || !proposedTimes[job.id]}
                >
                  {loadingAction === 'propose' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Proposing...
                    </>
                  ) : (
                    <>
                      <Clock4 className="mr-2 h-4 w-4" />
                      Propose Time
                    </>
                  )}
                </Button>
                
                <Button 
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]" 
                  onClick={() => handleAcceptJob(job.id)}
                  disabled={isLoading}
                >
                  {loadingAction === 'accept' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Accept Job
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Add this function after the fetchAvailableJobs function
  const trackViewedJobs = async (jobIds: string[]) => {
    if (!user || jobIds.length === 0) return
    
    try {
      // Use admin client to track views
      const { error } = await supabase
        .from('vet_job_views')
        .upsert(
          jobIds.map(id => ({
            vet_id: user.id,
            appointment_id: id
          })),
          { onConflict: 'vet_id,appointment_id' }
        )
      
      if (error) {
        console.error('Error tracking job views:', error)
      }
    } catch (err) {
      console.error('Error in trackViewedJobs:', err)
    }
  }

  // Add this function to get the real new job count
  const getNewJobsCount = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .rpc('get_new_jobs_count_for_vet', { vet_user_id: user.id })
      
      if (!error && data !== null) {
        setActualNewJobsCount(data)
      }
    } catch (err) {
      console.error('Error getting new jobs count:', err)
    }
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Available Jobs
            {actualNewJobsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {actualNewJobsCount} new
              </Badge>
            )}
          </h1>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="new">New Jobs Only</SelectItem>
                <SelectItem value="proposed">Awaiting Response</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                title={autoRefreshEnabled ? "Disable auto-refresh" : "Enable auto-refresh"}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefreshEnabled ? 'text-teal-600' : 'text-gray-400'}`} />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchAvailableJobs()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isBackgroundRefreshing && (
                <span className="text-xs text-gray-500 ml-2">Checking for updates...</span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading available jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map(renderJobCard)
        ) : (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No jobs available</h2>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'new' 
                ? 'There are no new appointments waiting for a vet.' 
                : statusFilter === 'proposed' 
                ? 'There are no appointments awaiting owner response.'
                : 'There are currently no appointments available. Check back later!'}
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
} 