"use client"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CancelAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  appointment: {
    date: string
    time_of_day: string
    pets?: { name: string }
    total_price: number
  }
}

export function CancelAppointmentModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  appointment 
}: CancelAppointmentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Show appointment details */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Appointment to cancel:</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Pet:</span> {appointment.pets?.name || 'Unknown'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span> {appointment.date}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Time:</span> {appointment.time_of_day}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Total:</span> ${appointment.total_price}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Cancelling this appointment will remove it permanently. 
            If you need to reschedule, please book a new appointment after cancelling.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 