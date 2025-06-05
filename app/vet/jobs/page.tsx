"use client"

import { useState, useEffect } from "react"
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
  const [jobs, setJobs] = useState<any[]>([])
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
  const user = useUser()
  const supabase = useSupabaseClient()

  const fetchAvailableJobs = async (isBackgroundRefresh = false) => {
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
  };

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

  useEffect(() => {
    if (!user) return;
    fetchAvailableJobs();

    // Add auto-refresh every 30 seconds only if enabled
    const interval = setInterval(() => {
      if (autoRefreshEnabled && !loading) {
        fetchAvailableJobs(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, supabase, autoRefreshEnabled, loading]);

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
  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'new') return job.status === 'waiting_for_vet';
    if (statusFilter === 'proposed') return job.status === 'time_proposed';
    return true;
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
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Requested Date</p>
                <p className="text-gray-600">
                  {job.date ? new Date(job.date).toLocaleDateString() : "Not specified"}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Requested Time</p>
                <p className="text-gray-600">{job.time_slot || "Not specified"}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-gray-600">{job.address || "Not specified"}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0">$</div>
              <div>
                <p className="font-medium">Payment Amount</p>
                <p className="text-gray-600">${job.total_price || "N/A"}</p>
              </div>
            </div>
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

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Available Jobs
            {newJobCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {newJobCount} new
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