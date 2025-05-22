"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { 
  Calendar, Clock, MapPin, CheckCircle, XCircle, 
  Clock4, FileText, PlusCircle, DollarSign, 
  Save, ArrowRight, MessageCircle, AlarmClock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Card, CardContent, CardDescription, 
  CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths 
} from 'date-fns'
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { formatAppointmentDate } from "@/lib/utils"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const user = useUser()
  const appointmentId = params.id as string
  
  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  
  // Proposed time dialog state
  const [isProposingTime, setIsProposingTime] = useState(false)
  const [proposedDate, setProposedDate] = useState<Date | undefined>(undefined)
  const [proposedTimeSlot, setProposedTimeSlot] = useState("")
  const [proposalMessage, setProposalMessage] = useState("")
  
  // Clinical record state
  const [clinicalRecord, setClinicalRecord] = useState({
    diagnosis: "",
    treatment: "",
    shared_notes: "",
    confidential_notes: "",
    follow_up_needed: false,
    follow_up_date: undefined as Date | undefined,
    follow_up_type: "check-up",
  })
  
  // Additional services state
  const [additionalServices, setAdditionalServices] = useState<Array<{
    id: string,
    name: string,
    price: number,
    description?: string
  }>>([])
  const [newService, setNewService] = useState({
    name: "",
    price: 0,
    description: ""
  })
  
  // Time slots
  const timeSlots = [
    "06:00 - 08:00 AM", 
    "08:00 - 10:00 AM", 
    "10:00 AM - 12:00 PM", 
    "12:00 - 02:00 PM", 
    "02:00 - 04:00 PM", 
    "04:00 - 06:00 PM",
    "06:00 - 08:00 PM"
  ]

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!user) return
      
      setLoading(true)
      
      try {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select(`
            *,
            pets:pet_id (*),
            pet_owner:pet_owner_id (*)
          `)
          .eq("id", appointmentId)
          .single()
        
        if (appointmentError) {
          throw appointmentError
        }
        
        setAppointment(appointmentData)
        
        // If a clinical record exists, fetch it
        if (appointmentData.clinical_record_id) {
          const { data: recordData, error: recordError } = await supabase
            .from("clinical_records")
            .select("*")
            .eq("id", appointmentData.clinical_record_id)
            .single()
            
          if (!recordError && recordData) {
            setClinicalRecord({
              diagnosis: recordData.diagnosis || "",
              treatment: recordData.treatment || "",
              shared_notes: recordData.shared_notes || "",
              confidential_notes: recordData.confidential_notes || "",
              follow_up_needed: !!recordData.follow_up_date,
              follow_up_date: recordData.follow_up_date ? new Date(recordData.follow_up_date) : undefined,
              follow_up_type: recordData.follow_up_type || "check-up",
            })
          }
        }
        
        // Fetch additional services if they exist
        if (appointmentData.additional_services_ids && appointmentData.additional_services_ids.length > 0) {
          const { data: servicesData, error: servicesError } = await supabase
            .from("additional_services")
            .select("*")
            .in("id", appointmentData.additional_services_ids)
            
          if (!servicesError && servicesData) {
            setAdditionalServices(servicesData)
          }
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error)
        toast({
          title: "Error",
          description: "Failed to load appointment details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchAppointmentDetails()
  }, [appointmentId, supabase, user, toast])
  
  const handleAcceptAppointment = async () => {
    if (!appointment) return
    
    setActionLoading(true)
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "in_progress",
          vet_id: user?.id,
          accepted_at: new Date().toISOString()
        })
        .eq("id", appointmentId)
      
      if (error) throw error
      
      // Send notification to pet owner
      await supabase.from("notifications").insert({
        user_id: appointment.pet_owner_id,
        type: "appointment_accepted",
        message: "Your appointment has been accepted by the veterinarian",
        appointment_id: appointmentId,
        created_at: new Date().toISOString()
      })
      
      // Update local state
      setAppointment({
        ...appointment,
        status: "in_progress",
        vet_id: user?.id,
        accepted_at: new Date().toISOString()
      })
      
      toast({
        title: "Success",
        description: "Appointment accepted successfully",
      })
      
      // Move to clinical record tab
      setActiveTab("record")
    } catch (error) {
      console.error("Error accepting appointment:", error)
      toast({
        title: "Error",
        description: "Failed to accept appointment",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleDeclineAppointment = async () => {
    if (!appointment) return
    
    setActionLoading(true)
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "declined",
          declined_at: new Date().toISOString(),
          declined_by: user?.id
        })
        .eq("id", appointmentId)
      
      if (error) throw error
      
      // Send notification to pet owner
      await supabase.from("notifications").insert({
        user_id: appointment.pet_owner_id,
        type: "appointment_declined",
        message: "Your appointment has been declined by the veterinarian",
        appointment_id: appointmentId,
        created_at: new Date().toISOString()
      })
      
      // Update local state
      setAppointment({
        ...appointment,
        status: "declined",
        declined_at: new Date().toISOString(),
        declined_by: user?.id
      })
      
      toast({
        title: "Success",
        description: "Appointment declined successfully",
      })
    } catch (error) {
      console.error("Error declining appointment:", error)
      toast({
        title: "Error",
        description: "Failed to decline appointment",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleProposeNewTime = async () => {
    if (!appointment || !proposedDate || !proposedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time slot",
        variant: "destructive",
      })
      return
    }
    
    setActionLoading(true)
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "time_proposed",
          proposed_date: proposedDate.toISOString(),
          proposed_time: proposedTimeSlot,
          proposed_message: proposalMessage,
          proposed_at: new Date().toISOString(),
          proposed_by: user?.id
        })
        .eq("id", appointmentId)
      
      if (error) throw error
      
      // Send notification to pet owner
      await supabase.from("notifications").insert({
        user_id: appointment.pet_owner_id,
        type: "time_proposed",
        message: "A new time has been proposed for your appointment",
        appointment_id: appointmentId,
        created_at: new Date().toISOString()
      })
      
      // Update local state
      setAppointment({
        ...appointment,
        status: "time_proposed",
        proposed_date: proposedDate.toISOString(),
        proposed_time: proposedTimeSlot,
        proposed_message: proposalMessage,
        proposed_at: new Date().toISOString(),
        proposed_by: user?.id
      })
      
      setIsProposingTime(false)
      
      toast({
        title: "Success",
        description: "New time proposed successfully",
      })
    } catch (error) {
      console.error("Error proposing new time:", error)
      toast({
        title: "Error",
        description: "Failed to propose new time",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleAddService = () => {
    if (!newService.name || newService.price <= 0) {
      toast({
        title: "Error",
        description: "Please provide a service name and valid price",
        variant: "destructive",
      })
      return
    }
    
    // Generate temporary ID
    const tempId = `temp-${Date.now()}`
    
    setAdditionalServices([
      ...additionalServices,
      {
        id: tempId,
        name: newService.name,
        price: newService.price,
        description: newService.description || undefined
      }
    ])
    
    // Reset form
    setNewService({
      name: "",
      price: 0,
      description: ""
    })
  }
  
  const handleRemoveService = (id: string) => {
    setAdditionalServices(additionalServices.filter(service => service.id !== id))
  }
  
  const handleSaveClinicalRecord = async () => {
    if (!appointment) return
    
    setActionLoading(true)
    
    try {
      // Save or update clinical record
      let recordId = appointment.clinical_record_id
      let recordOperation
      
      if (!recordId) {
        // Create new record
        const { data, error } = await supabase
          .from("clinical_records")
          .insert({
            appointment_id: appointmentId,
            pet_id: appointment.pet_id,
            vet_id: user?.id,
            diagnosis: clinicalRecord.diagnosis,
            treatment: clinicalRecord.treatment,
            shared_notes: clinicalRecord.shared_notes,
            confidential_notes: clinicalRecord.confidential_notes,
            follow_up_date: clinicalRecord.follow_up_needed ? clinicalRecord.follow_up_date?.toISOString() : null,
            follow_up_type: clinicalRecord.follow_up_needed ? clinicalRecord.follow_up_type : null,
            created_at: new Date().toISOString()
          })
          .select("id")
          .single()
          
        if (error) throw error
        recordId = data.id
        recordOperation = "created"
      } else {
        // Update existing record
        const { error } = await supabase
          .from("clinical_records")
          .update({
            diagnosis: clinicalRecord.diagnosis,
            treatment: clinicalRecord.treatment,
            shared_notes: clinicalRecord.shared_notes,
            confidential_notes: clinicalRecord.confidential_notes,
            follow_up_date: clinicalRecord.follow_up_needed ? clinicalRecord.follow_up_date?.toISOString() : null,
            follow_up_type: clinicalRecord.follow_up_needed ? clinicalRecord.follow_up_type : null,
            updated_at: new Date().toISOString()
          })
          .eq("id", recordId)
          
        if (error) throw error
        recordOperation = "updated"
      }
      
      // Save additional services
      const servicesIds = []
      
      for (const service of additionalServices) {
        if (service.id.startsWith('temp-')) {
          // New service
          const { data, error } = await supabase
            .from("additional_services")
            .insert({
              appointment_id: appointmentId,
              name: service.name,
              price: service.price,
              description: service.description,
              created_at: new Date().toISOString()
            })
            .select("id")
            .single()
            
          if (error) throw error
          servicesIds.push(data.id)
        } else {
          // Existing service
          servicesIds.push(service.id)
        }
      }
      
      // Update appointment with clinical record and services
      const { error } = await supabase
        .from("appointments")
        .update({
          clinical_record_id: recordId,
          additional_services_ids: servicesIds,
          updated_at: new Date().toISOString()
        })
        .eq("id", appointmentId)
      
      if (error) throw error
      
      // Send notification to pet owner
      await supabase.from("notifications").insert({
        user_id: appointment.pet_owner_id,
        type: "clinical_record_updated",
        message: `The clinical record for your appointment has been ${recordOperation}`,
        appointment_id: appointmentId,
        created_at: new Date().toISOString()
      })
      
      // Update local state
      setAppointment({
        ...appointment,
        clinical_record_id: recordId,
        additional_services_ids: servicesIds
      })
      
      toast({
        title: "Success",
        description: `Clinical record ${recordOperation} successfully`,
      })
    } catch (error) {
      console.error("Error saving clinical record:", error)
      toast({
        title: "Error",
        description: "Failed to save clinical record",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  const handleCompleteAppointment = async () => {
    if (!appointment) return
    
    setActionLoading(true)
    
    try {
      // Ensure clinical record exists
      if (!appointment.clinical_record_id) {
        await handleSaveClinicalRecord()
      }
      
      // Calculate total cost including additional services
      const serviceTotal = additionalServices.reduce((sum, service) => sum + service.price, 0)
      const totalCost = (appointment.total_price || 0) + serviceTotal
      
      // Update appointment status to completed
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          final_price: totalCost,
          updated_at: new Date().toISOString()
        })
        .eq("id", appointmentId)
      
      if (error) throw error
      
      // Send notification to pet owner
      await supabase.from("notifications").insert({
        user_id: appointment.pet_owner_id,
        type: "appointment_completed",
        message: "Your appointment has been marked as completed",
        appointment_id: appointmentId,
        created_at: new Date().toISOString()
      })
      
      // Update local state
      setAppointment({
        ...appointment,
        status: "completed",
        completed_at: new Date().toISOString(),
        final_price: totalCost
      })
      
      toast({
        title: "Success",
        description: "Appointment marked as completed",
      })
      
      // Navigate back to appointments list
      router.push("/vet/appointments")
    } catch (error) {
      console.error("Error completing appointment:", error)
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }
  
  if (!appointment) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
          <p className="text-gray-600 mb-6">The appointment you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button asChild>
            <Link href="/vet/appointments">Back to Appointments</Link>
          </Button>
        </div>
      </div>
    )
  }
  
  const isAppointmentPending = appointment.status === "waiting_for_vet"
  const isAppointmentInProgress = appointment.status === "in_progress"
  const isAppointmentCompleted = appointment.status === "completed"
  const petName = appointment.pets?.name || "Unknown Pet"
  const petType = appointment.pets?.type || "Pet"
  const ownerName = appointment.pet_owner?.first_name && appointment.pet_owner?.last_name 
    ? `${appointment.pet_owner.first_name} ${appointment.pet_owner.last_name}`
    : "Unknown Owner"
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Appointment: {petName}</h1>
          <p className="text-gray-600">
            Appointment ID: {appointmentId} • Status: {appointment.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            asChild
          >
            <Link href="/vet/appointments">
              Back to Appointments
            </Link>
          </Button>
          
          <Button
            variant="outline"
            asChild
          >
            <Link href={`/vet/messages?appointment=${appointmentId}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Message Owner
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="record" disabled={!(isAppointmentInProgress || isAppointmentCompleted)}>
            Clinical Record
          </TabsTrigger>
          <TabsTrigger value="services" disabled={!(isAppointmentInProgress || isAppointmentCompleted)}>
            Additional Services
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Appointment Details
                {isAppointmentPending && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Pending Approval
                  </span>
                )}
                {isAppointmentInProgress && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    In Progress
                  </span>
                )}
                {isAppointmentCompleted && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Completed
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Review appointment information and manage its status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mr-4">
                      {appointment.pets?.image ? (
                        <Image 
                          src={appointment.pets.image} 
                          alt={petName} 
                          width={48} 
                          height={48} 
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-teal-600 font-semibold">
                          {petName.substring(0, 1)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{petName}</h3>
                      <p className="text-gray-600">{petType}</p>
                      <p className="text-gray-600 text-sm mt-1">Owner: {ownerName}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-teal-500 mr-3" />
                      <div>
                        <p className="font-medium">Appointment Date</p>
                        <p className="text-gray-600">{formatAppointmentDate(appointment.date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-teal-500 mr-3" />
                      <div>
                        <p className="font-medium">Time Slot</p>
                        <p className="text-gray-600">{appointment.time_slot || "Not specified"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-teal-500 mr-3" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-gray-600">{appointment.address || "Not specified"}</p>
                        {appointment.additional_info && (
                          <p className="text-gray-500 text-sm">{appointment.additional_info}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-teal-500 mr-3" />
                      <div>
                        <p className="font-medium">Base Fee</p>
                        <p className="text-gray-600">${appointment.total_price || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="font-semibold mb-2">Issue Description</h3>
                    <p className="text-gray-600">
                      {appointment.notes || "No description provided"}
                    </p>
                  </div>
                  
                  {appointment.status === "time_proposed" && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h3 className="font-semibold text-yellow-800 mb-2">Time Change Proposed</h3>
                      <p className="text-yellow-700 mb-2">
                        {appointment.proposed_message || "You have proposed a new time for this appointment"}
                      </p>
                      <div className="bg-white p-3 rounded border border-yellow-200 space-y-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-yellow-600 mr-2" />
                          <p className="text-gray-700">
                            {appointment.proposed_date ? formatAppointmentDate(appointment.proposed_date) : "Date not specified"}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                          <p className="text-gray-700">
                            {appointment.proposed_time || "Time not specified"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-yellow-700 mt-2">
                        Waiting for owner to respond
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t pt-6">
              {isAppointmentPending && (
                <div className="flex flex-wrap gap-3 w-full">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline Appointment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Decline This Appointment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to decline this appointment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={handleDeclineAppointment}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Declining..." : "Yes, Decline"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Dialog open={isProposingTime} onOpenChange={setIsProposingTime}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Clock4 className="mr-2 h-4 w-4" />
                        Propose New Time
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Propose a New Time</DialogTitle>
                        <DialogDescription>
                          Suggest an alternative time for this appointment
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>Select a Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {proposedDate ? format(proposedDate, 'PPP') : "Select a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={proposedDate}
                                onSelect={setProposedDate}
                                initialFocus
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Select a Time Slot</Label>
                          <Select
                            value={proposedTimeSlot}
                            onValueChange={setProposedTimeSlot}
                          >
                            <SelectTrigger>
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
                        
                        <div className="space-y-2">
                          <Label>Message (Optional)</Label>
                          <Textarea
                            placeholder="Explain why you're proposing a new time..."
                            value={proposalMessage}
                            onChange={(e) => setProposalMessage(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsProposingTime(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProposeNewTime}
                          disabled={!proposedDate || !proposedTimeSlot || actionLoading}
                        >
                          {actionLoading ? "Sending Proposal..." : "Send Proposal"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    className="bg-[#4e968f] hover:bg-[#43847e] ml-auto"
                    onClick={handleAcceptAppointment}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {actionLoading ? "Accepting..." : "Accept Appointment"}
                  </Button>
                </div>
              )}
              
              {isAppointmentInProgress && (
                <div className="flex flex-wrap gap-3 w-full justify-end">
                  <Button
                    className="bg-[#4e968f] hover:bg-[#43847e]"
                    onClick={() => setActiveTab("record")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Start Clinical Record
                  </Button>
                </div>
              )}
              
              {isAppointmentCompleted && (
                <p className="text-green-600 font-medium">
                  This appointment has been completed
                </p>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="record" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Record</CardTitle>
              <CardDescription>
                Document your findings, treatment, and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    placeholder="Enter your diagnosis..."
                    value={clinicalRecord.diagnosis}
                    onChange={(e) => setClinicalRecord({...clinicalRecord, diagnosis: e.target.value})}
                    className="mt-1"
                    disabled={isAppointmentCompleted}
                  />
                </div>
                
                <div>
                  <Label htmlFor="treatment">Treatment Provided</Label>
                  <Textarea
                    id="treatment"
                    placeholder="Describe the treatment provided..."
                    value={clinicalRecord.treatment}
                    onChange={(e) => setClinicalRecord({...clinicalRecord, treatment: e.target.value})}
                    className="mt-1"
                    disabled={isAppointmentCompleted}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <Label htmlFor="shared_notes" className="flex items-center">
                    <span>Notes for Pet Owner</span>
                    <span className="ml-auto text-sm text-green-600">Visible to pet owner</span>
                  </Label>
                  <Textarea
                    id="shared_notes"
                    placeholder="Instructions or information for the pet owner..."
                    value={clinicalRecord.shared_notes}
                    onChange={(e) => setClinicalRecord({...clinicalRecord, shared_notes: e.target.value})}
                    className="mt-1"
                    disabled={isAppointmentCompleted}
                  />
                </div>
                
                <div>
                  <Label htmlFor="confidential_notes" className="flex items-center">
                    <span>Confidential Notes</span>
                    <span className="ml-auto text-sm text-yellow-600">Only visible to you</span>
                  </Label>
                  <Textarea
                    id="confidential_notes"
                    placeholder="Private notes not shared with the pet owner..."
                    value={clinicalRecord.confidential_notes}
                    onChange={(e) => setClinicalRecord({...clinicalRecord, confidential_notes: e.target.value})}
                    className="mt-1"
                    disabled={isAppointmentCompleted}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="follow_up_needed"
                      checked={clinicalRecord.follow_up_needed}
                      onCheckedChange={(checked) => 
                        setClinicalRecord({...clinicalRecord, follow_up_needed: !!checked})
                      }
                      disabled={isAppointmentCompleted}
                    />
                    <Label htmlFor="follow_up_needed">Follow-up appointment recommended</Label>
                  </div>
                  
                  {clinicalRecord.follow_up_needed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div>
                        <Label>Recommended Follow-up Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-1"
                              disabled={isAppointmentCompleted}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {clinicalRecord.follow_up_date 
                                ? format(clinicalRecord.follow_up_date, 'PPP') 
                                : "Select a date"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={clinicalRecord.follow_up_date}
                              onSelect={(date) => 
                                setClinicalRecord({...clinicalRecord, follow_up_date: date})
                              }
                              initialFocus
                              disabled={(date) => date <= new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => 
                              setClinicalRecord({
                                ...clinicalRecord, 
                                follow_up_date: addDays(new Date(), 7)
                              })
                            }
                            disabled={isAppointmentCompleted}
                          >
                            +7 days
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => 
                              setClinicalRecord({
                                ...clinicalRecord, 
                                follow_up_date: addWeeks(new Date(), 2)
                              })
                            }
                            disabled={isAppointmentCompleted}
                          >
                            +2 weeks
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => 
                              setClinicalRecord({
                                ...clinicalRecord, 
                                follow_up_date: addMonths(new Date(), 1)
                              })
                            }
                            disabled={isAppointmentCompleted}
                          >
                            +1 month
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Follow-up Type</Label>
                        <Select
                          value={clinicalRecord.follow_up_type}
                          onValueChange={(value) => 
                            setClinicalRecord({...clinicalRecord, follow_up_type: value})
                          }
                          disabled={isAppointmentCompleted}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="check-up">Regular Check-up</SelectItem>
                            <SelectItem value="treatment">Treatment Continuation</SelectItem>
                            <SelectItem value="test-results">Test Results</SelectItem>
                            <SelectItem value="vaccination">Vaccination</SelectItem>
                            <SelectItem value="surgery-followup">Post-Surgery Follow-up</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t pt-6">
              <Button
                variant="outline"
                onClick={() => setActiveTab("details")}
                disabled={actionLoading}
              >
                Back to Details
              </Button>
              
              <div className="flex gap-3">
                {!isAppointmentCompleted && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("services")}
                      disabled={actionLoading}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Services
                    </Button>
                    
                    <Button
                      className="bg-[#4e968f] hover:bg-[#43847e]"
                      onClick={handleSaveClinicalRecord}
                      disabled={actionLoading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {actionLoading ? "Saving..." : "Save Record"}
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Services</CardTitle>
              <CardDescription>
                Add any extra services, medication, or treatments provided
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {additionalServices.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Services Added</h3>
                  <div className="border rounded-md divide-y">
                    {additionalServices.map((service) => (
                      <div key={service.id} className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-600">{service.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">${service.price.toFixed(2)}</span>
                          {!isAppointmentCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveService(service.id)}
                            >
                              <XCircle className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md border">
                    <span className="font-semibold">Total Additional Charges</span>
                    <span className="text-lg font-bold">
                      ${additionalServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md border">
                  <p className="text-gray-600">No additional services added yet</p>
                </div>
              )}
              
              {!isAppointmentCompleted && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Add New Service</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service_name">Service/Medication Name</Label>
                      <Input
                        id="service_name"
                        placeholder="Enter name"
                        value={newService.name}
                        onChange={(e) => setNewService({...newService, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="service_price">Price ($)</Label>
                      <Input
                        id="service_price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newService.price || ""}
                        onChange={(e) => setNewService({
                          ...newService, 
                          price: parseFloat(e.target.value) || 0
                        })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="service_description">Description (Optional)</Label>
                      <Textarea
                        id="service_description"
                        placeholder="Description, dosage, instructions, etc."
                        value={newService.description}
                        onChange={(e) => setNewService({...newService, description: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <Button
                    className="mt-4"
                    onClick={handleAddService}
                    disabled={!newService.name || newService.price <= 0}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between border-t pt-6">
              <Button
                variant="outline"
                onClick={() => setActiveTab("record")}
                disabled={actionLoading}
              >
                Back to Clinical Record
              </Button>
              
              {!isAppointmentCompleted && (
                <Button
                  className="bg-[#4e968f] hover:bg-[#43847e]"
                  onClick={handleCompleteAppointment}
                  disabled={actionLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {actionLoading ? "Completing..." : "Complete Appointment"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 