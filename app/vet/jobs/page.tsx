"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Calendar, Clock, MapPin, Check, X, Clock4, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { getStatusLabel } from "@/lib/appointment-statuses"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { ErrorBoundary } from "@/components/error-boundary"

export default function VetJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({})
  const [proposedMessages, setProposedMessages] = useState<Record<string, string>>({})
  const [newJobCount, setNewJobCount] = useState(0)
  const [previousJobIds, setPreviousJobIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'proposed'>('all')
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({})
  const user = useUser()
  const supabase = useSupabaseClient()

  const fetchAvailableJobs = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch appointments without any joins
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .in("status", ["waiting_for_vet", "confirmed"])
        .order("created_at", { ascending: false });
      
      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        toast({
          title: "Error",
          description: "Failed to fetch available jobs",
          variant: "destructive",
        });
        setJobs([]);
        return;
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Step 2: Get unique pet IDs
      const petIds = [...new Set(appointmentsData.map(apt => apt.pet_id).filter(Boolean))];
      
      // Step 3: Fetch pets separately
      let petsData: any[] = [];
      if (petIds.length > 0) {
        const { data: pets, error: petsError } = await supabase
          .from("pets")
          .select("*")
          .in("id", petIds);
        
        if (!petsError && pets) {
          petsData = pets;
        }
      }

      // Step 4: Get unique owner IDs
      const ownerIds = [...new Set(appointmentsData.map(apt => apt.pet_owner_id).filter(Boolean))];
      
      // Step 5: Fetch owners separately
      let ownersData: any[] = [];
      if (ownerIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, phone")
          .in("id", ownerIds);
        
        if (!ownersError && owners) {
          ownersData = owners;
        }
      }

      // Step 6: Combine the data
      const jobsWithDetails = appointmentsData.map(apt => ({
        ...apt,
        pets: petsData.find(pet => pet.id === apt.pet_id) || null,
        pet_owner: ownersData.find(owner => owner.id === apt.pet_owner_id) || null
      }));

      setJobs(jobsWithDetails);
      
      // Check for new jobs notification logic...
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
      
    } catch (err) {
      console.error("Error in fetchAvailableJobs:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAvailableJobs();

    // Add auto-refresh every 30 seconds for new jobs
    const interval = setInterval(() => {
      fetchAvailableJobs();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, supabase]);

  const handleAcceptJob = async (jobId: string) => {
    setLoadingActions(prev => ({ ...prev, [jobId]: 'accept' }));
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    setLoading(true);
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setLoading(false);
    }
  };

  const handleProposeTime = async (jobId: string, proposedTime: string, message?: string) => {
    if (!proposedTime) {
      toast({
        title: "Error",
        description: "Please enter a proposed time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: jobId,
          action: 'propose',
          proposedTime,
          message: message || `Vet proposed a new time: ${proposedTime}`,
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
      
      await fetchAvailableJobs();
      setProposedTimes({}); // Clear proposed times
    } catch (error: any) {
      console.error("Error proposing time:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to propose new time",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                <span>No img</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{job.pets?.name || "Unknown Pet"}</h2>
            <p className="text-gray-600 truncate">{job.pets?.species || job.pets?.type || "Pet"}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-teal-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Requested Date</p>
                <p className="text-gray-600">{job.date ? new Date(job.date).toLocaleDateString() : "Not specified"}</p>
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
        <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3 justify-end">
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeclineJob(job.id)}>
            <X className="mr-2 h-4 w-4" /> Decline
          </Button>
          <Button variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleProposeTime(job.id, proposedTimes[job.id] || "")}>
            <Clock4 className="mr-2 h-4 w-4" /> Propose New Time
          </Button>
          <Button className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]" onClick={() => handleAcceptJob(job.id)}>
            <Check className="mr-2 h-4 w-4" /> Accept Job
          </Button>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Incoming Jobs
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAvailableJobs}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
            <p className="text-gray-600 mb-6">There are currently no new appointments waiting for a vet. Check back later!</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
} 