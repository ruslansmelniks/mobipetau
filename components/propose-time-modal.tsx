"use client"

import { useState } from 'react'
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
  // Pre-populate state with current appointment data
  const [proposedDate, setProposedDate] = useState(() => formatDateForInput(appointment?.date));
  const [timeOfDay, setTimeOfDay] = useState(() => {
    if (!appointment?.time_slot) return 'morning';
    const timeStr = appointment.time_slot.toLowerCase();
    if (timeStr.includes('am') || timeStr.includes('morning')) {
      return 'morning';
    } else if (timeStr.includes('pm')) {
      const hour = parseInt(timeStr.split(':')[0]);
      if (hour === 12 || (hour >= 1 && hour < 6)) {
        return 'afternoon';
      }
      return 'evening';
    }
    return 'afternoon';
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(() => normalizeTimeFormat(appointment?.time_slot || ''));
  const [exactTime, setExactTime] = useState('');
  const [useExactTime, setUseExactTime] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Robust data access with fallbacks
  const petName = appointment?.pets?.name 
    || appointment?.pet_name 
    || 'Not specified';
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
    if (!proposedDate || (!selectedTimeSlot && !exactTime)) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        appointmentId: appointment.id,
        proposedDate,
        proposedTime: useExactTime ? exactTime : selectedTimeSlot,
        message
      });
      onClose();
    } catch (error) {
      console.error('Error proposing time:', error);
      toast({
        title: "Error",
        description: "Failed to propose new time",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
            <div>
              <span className="text-gray-500">Pet:</span>
              <p className="font-medium">{petName}</p>
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
              <p className="font-medium">{appointment?.time_slot || 'Not specified'}</p>
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
                {currentSlots.map((slot: string) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setSelectedTimeSlot(slot);
                      setUseExactTime(false);
                    }}
                    className={`
                      p-3 rounded-lg border text-sm font-medium transition-all
                      ${selectedTimeSlot === slot && !useExactTime
                        ? 'border-teal-500 bg-teal-50 text-teal-700' 
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
          {isTimeChanged && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Different from original appointment time
              </p>
            </div>
          )}
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