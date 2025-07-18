"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from "@/components/ui/switch"
import { Calendar, Clock, Loader2, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabase'

interface ProposeTimeModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: {
    id: string
    date: string
    time: string
    time_of_day: string
    address: string
    notes: string
    pets?: { name: string }
    users?: { first_name: string; last_name: string }
    service_type?: string
    pet_owner?: { first_name: string; last_name: string; phone: string }
    owner_name?: string
    owner_phone?: string
    pet_name?: string
    time_slot?: string
  }
  onSubmit: (proposalData: {
    appointmentId: string
    proposedDate: string
    proposedTime: string
    message?: string
  }) => Promise<void>
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const TimeSlotSelector = ({ 
  selectedDate, 
  selectedTimeSlot, 
  onTimeSlotSelect,
  preferredTimeOfDay,
  onTimeOfDayChange 
}: {
  selectedDate: string;
  selectedTimeSlot: string;
  onTimeSlotSelect: (slot: string) => void;
  preferredTimeOfDay: string;
  onTimeOfDayChange: (timeOfDay: string) => void;
}) => {
  const timeSlots = {
    morning: [
      "06:00 - 08:00 AM",
      "08:00 - 10:00 AM", 
      "10:00 - 12:00 PM"
    ],
    afternoon: [
      "12:00 - 02:00 PM",
      "02:00 - 04:00 PM",
      "04:00 - 06:00 PM"
    ],
    evening: [
      "06:00 - 08:00 PM",
      "08:00 - 10:00 PM"
    ]
  };
  const currentSlots = timeSlots[preferredTimeOfDay as keyof typeof timeSlots] || [];
  return (
    <div className="space-y-4">
      <div>
        <Label>Preferred time of the day</Label>
        <Select value={preferredTimeOfDay} onValueChange={onTimeOfDayChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="afternoon">Afternoon</SelectItem>
            <SelectItem value="evening">Evening</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {currentSlots.length > 0 && (
        <div>
          <Label>Available time slots</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {currentSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeSlotSelect(slot)}
                className={`
                  p-3 rounded-lg border text-sm font-medium transition-all
                  ${selectedTimeSlot === slot 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function ProposeTimeModal({ 
  isOpen, 
  onClose, 
  appointment, 
  onSubmit 
}: ProposeTimeModalProps) {
  // Helper function - define at the top
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  const normalizeTimeFormat = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.replace(/(\d):/, (match, p1) => p1.padStart(2, '0') + ':');
  };
  // Debug logging
  console.log('Appointment data in modal:', appointment);
  console.log('Pet data:', appointment?.pets);
  console.log('Owner data:', appointment?.pet_owner);
  // Add debug useEffect
  useEffect(() => {
    if (appointment) {
      console.log('Full appointment data:', appointment);
      console.log('Time slot value:', appointment.time_slot);
      console.log('Pet data:', appointment.pets);
    }
  }, [appointment]);
  // Pre-populate state with current appointment data
  const [proposedDate, setProposedDate] = useState(() => formatDateForInput(appointment?.date));
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  // Add debug logs after state declarations
  console.log('Modal appointment:', appointment);
  console.log('Modal selectedTimeSlot:', selectedTimeSlot);
  console.log('Modal timeOfDay:', timeOfDay);
  const [exactTime, setExactTime] = useState('');
  const [useExactTime, setUseExactTime] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Robust data access with fallbacks
  const petName = typeof appointment?.pets?.name === 'string' ? appointment.pets.name : 'Not specified';
  const petImage = appointment?.pets && typeof appointment.pets === 'object' && 'image' in appointment.pets && typeof appointment.pets.image === 'string' ? appointment.pets.image : null;
  const petType = appointment?.pets && typeof appointment.pets === 'object' && 'type' in appointment.pets && typeof appointment.pets.type === 'string' ? appointment.pets.type : '';
  const petBreed = appointment?.pets && typeof appointment.pets === 'object' && 'breed' in appointment.pets && typeof appointment.pets.breed === 'string' ? appointment.pets.breed : '';
  const ownerName = appointment?.pet_owner 
    ? `${appointment.pet_owner.first_name || ''} ${appointment.pet_owner.last_name || ''}`.trim()
    : appointment?.owner_name 
    || 'Not specified';
  const ownerPhone = appointment?.pet_owner?.phone 
    || appointment?.owner_phone 
    || '';
  // Check if time has changed
  const isTimeChanged = proposedDate !== formatDateForInput(appointment?.date) 
    || (selectedTimeSlot && selectedTimeSlot !== normalizeTimeFormat(appointment?.time_slot || ''));
  // Handle form submission
  const handleSubmit = async () => {
    if (!proposedDate || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select both a date and time slot",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "No active session. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Use the same endpoint as Accept/Decline
      const response = await fetch('/api/vet/appointment-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          action: 'propose',
          proposedDate: proposedDate,
          proposedTime: selectedTimeSlot,
          message: message || ''
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to propose new time');
      }

      toast({
        title: "Proposal sent",
        description: `A new time proposal has been sent to ${appointment.pet_owner?.first_name || 'the pet owner'} for confirmation.`,
        variant: "default",
      });

      // Call the onSubmit callback if provided
      // (Removed, not needed)

      onClose();
    } catch (error: any) {
      console.error('Error proposing new time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to propose new time",
        variant: "destructive",
      });
    }
  };
  // Time slots configuration
  const timeSlots: { [key: string]: string[] } = {
    morning: [
      "06:00 - 08:00 AM",
      "08:00 - 10:00 AM", 
      "10:00 - 12:00 PM"
    ],
    afternoon: [
      "12:00 - 02:00 PM",
      "02:00 - 04:00 PM",
      "04:00 - 06:00 PM"
    ],
    evening: [
      "06:00 - 08:00 PM",
      "08:00 - 10:00 PM"
    ]
  };
  const currentSlots = timeSlots[timeOfDay] || [];
  // Add pre-selection useEffect for time slot and time of day
  useEffect(() => {
    if (appointment?.time_slot) {
      const slot = appointment.time_slot.trim();
      console.log('Pre-selecting time slot:', slot);
      // Detect which time period this slot belongs to
      if (["06:00 - 08:00 AM", "08:00 - 10:00 AM", "10:00 - 12:00 PM"].includes(slot)) {
        setTimeOfDay('morning');
      } else if (["12:00 - 02:00 PM", "02:00 - 04:00 PM", "04:00 - 06:00 PM"].includes(slot)) {
        setTimeOfDay('afternoon');
      } else if (["06:00 - 08:00 PM", "08:00 - 10:00 PM"].includes(slot)) {
        setTimeOfDay('evening');
      }
      setSelectedTimeSlot(slot);
    }
  }, [appointment]);
  // Add useEffect to sync state with appointment prop
  useEffect(() => {
    if (appointment) {
      console.log('useEffect running for appointment:', appointment);
      if (appointment.time_of_day) {
        setTimeOfDay(appointment.time_of_day);
      }
      if (appointment.time_slot) {
        setSelectedTimeSlot(appointment.time_slot);
      }
    }
  }, [appointment]);
  // Debug logging for modal state
  useEffect(() => {
    console.log('=== PROPOSE TIME MODAL DEBUG ===');
    console.log('Appointment data:', appointment);
    console.log('Time slot:', appointment?.time_slot);
    console.log('Current timeOfDay state:', timeOfDay);
    console.log('Current selectedTimeSlot state:', selectedTimeSlot);
  }, [appointment, timeOfDay, selectedTimeSlot]);
  // Defensive logs and minimal test render at the top of the component
  console.log('Modal appointment at top:', appointment);
  console.log('Modal appointment keys:', appointment && Object.keys(appointment));
  console.log('Modal appointment.time_slot:', appointment && appointment.time_slot);
  if (!appointment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Appointment data is not available. Please try again.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose New Time</DialogTitle>
          <DialogDescription>
            Suggest a different time for this appointment
          </DialogDescription>
        </DialogHeader>
        {/* Enhanced Appointment Details Section */}
        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start space-x-3">
              {petImage && (
                <img 
                  src={petImage} 
                  alt={petName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <span className="text-gray-500">Pet:</span>
                <p className="font-medium">{petName}</p>
                {petType && petBreed && (
                  <p className="text-xs text-gray-600">{petType} - {petBreed}</p>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Owner:</span>
              <p className="font-medium">{ownerName}</p>
            </div>
            <div>
              <span className="text-gray-500">Location:</span>
              <p className="font-medium">{appointment?.address || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-500">Current Date:</span>
              <p className="font-medium">
                {appointment?.date 
                  ? new Date(appointment.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Current Time:</span>
              <p className="font-medium text-teal-600">
                {appointment?.time_slot || appointment?.time || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Service:</span>
              <p className="font-medium">{appointment?.service_type || 'General Consultation'}</p>
            </div>
            {ownerPhone && (
              <div>
                <span className="text-gray-500">Contact:</span>
                <p className="font-medium">{ownerPhone}</p>
              </div>
            )}
            {appointment?.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">Notes:</span>
                <p className="font-medium mt-1 text-gray-700">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <Label>Proposed Date *</Label>
            <div className="relative mt-1">
              <Input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>
          {/* Time Period Selection */}
          <div>
            <Label>Preferred time of the day</Label>
            <Select value={timeOfDay} onValueChange={setTimeOfDay}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Time Slots */}
          {currentSlots.length > 0 && (
            <div>
              <Label>Available time slots</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {currentSlots.map((slot) => {
                  console.log('Button slot:', slot, 'Selected:', selectedTimeSlot, 'Appointment time_slot:', appointment?.time_slot);
                  const isSelected = selectedTimeSlot.trim() === slot.trim();
                  const isCurrentAppointmentSlot = (appointment?.time_slot || '').trim() === slot.trim();
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setUseExactTime(false);
                      }}
                      className={`
                        p-3 rounded-lg border text-sm font-medium transition-all relative
                        ${isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500 ring-opacity-20' 
                          : isCurrentAppointmentSlot
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {slot}
                      {isCurrentAppointmentSlot && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Exact Time Option */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Switch
                id="exact-time"
                checked={useExactTime}
                onCheckedChange={setUseExactTime}
              />
              <Label htmlFor="exact-time" className="cursor-pointer">
                Specify exact time instead
              </Label>
            </div>
            {useExactTime && (
              <div className="ml-6">
                <Label>Preferred Exact Time</Label>
                <div className="relative mt-1">
                  <Input
                    type="time"
                    value={exactTime}
                    onChange={(e) => setExactTime(e.target.value)}
                    className="pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
              </div>
            )}
          </div>
          {/* Time Change Indicator */}
          {/* Remove any JSX or logic that displays a warning or message about 'Different from original appointment time'.
              Only keep the 'Current Time' display in the Appointment Details section. */}
          {/* Message */}
          <div>
            <Label>Message to Pet Owner (Optional)</Label>
            <Textarea
              placeholder="Add a note explaining why you're proposing this time..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[100px]"
            />
            <p className="text-sm text-gray-500 mt-1">
              Help the pet owner understand why this time works better
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!proposedDate || (!selectedTimeSlot && !exactTime))}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Proposal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 