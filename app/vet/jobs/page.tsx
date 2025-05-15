"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Calendar, Clock, MapPin, Check, X, Clock4 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { getStatusLabel } from "@/lib/appointment-statuses"

export default function VetJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const user = useUser()
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (!user) return;
    const fetchAvailableJobs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(`*, pets:pet_id (*), pet_owner:pet_owner_id (*)`)
          .eq("status", "waiting_for_vet")
          .order("created_at", { ascending: false });
        if (error) {
          setJobs([]);
        } else {
          setJobs(data || []);
        }
      } catch (err) {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableJobs();
  }, [user, supabase]);

  const handleAcceptJob = async (jobId: string) => {
    // TODO: Implement accept logic
    alert(`Accept job ${jobId}`);
  };

  const handleDeclineJob = async (jobId: string) => {
    // TODO: Implement decline logic
    alert(`Decline job ${jobId}`);
  };

  const handleProposeTime = async (jobId: string) => {
    // TODO: Implement propose time logic
    alert(`Propose new time for job ${jobId}`);
  };

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
          <Button variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleProposeTime(job.id)}>
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
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Incoming Jobs</h1>
        <div className="relative w-full md:w-64">
          <Input
            placeholder="Search jobs"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available jobs...</p>
        </div>
      ) : jobs.length > 0 ? (
        jobs.map(renderJobCard)
      ) : (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No jobs available</h2>
          <p className="text-gray-600 mb-6">There are currently no new appointments waiting for a vet. Check back later!</p>
        </div>
      )}
    </div>
  );
} 