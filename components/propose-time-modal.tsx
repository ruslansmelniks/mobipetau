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
  }
  onSubmit: (proposalData: {
    proposedDate: string
    proposedTimeRange: string
    proposedExactTime?: string
    message?: string
  }) => Promise<void>
}

export function ProposeTimeModal({ 
  isOpen, 
  onClose, 
  appointment, 
  onSubmit 
}: ProposeTimeModalProps) {
  const [proposedDate, setProposedDate] = useState(appointment.date || '')
  const [proposedTimeRange, setProposedTimeRange] = useState(appointment.time_of_day || '')
  const [proposedExactTime, setProposedExactTime] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeRangeOptions = [
    { value: 'morning', label: 'Morning (6:00 AM - 12:00 PM)' },
    { value: 'afternoon', label: 'Afternoon (12:00 PM - 6:00 PM)' },
    { value: 'evening', label: 'Evening (6:00 PM - 10:00 PM)' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposedDate || !proposedTimeRange) {
      alert('Please select both date and time range')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({
        proposedDate,
        proposedTimeRange,
        proposedExactTime: proposedExactTime || undefined,
        message: message || undefined
      })
      onClose()
      setProposedDate(appointment.date || '')
      setProposedTimeRange(appointment.time_of_day || '')
      setProposedExactTime('')
      setMessage('')
    } catch (error) {
      console.error('Error submitting proposal:', error)
      alert('Failed to submit proposal. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Propose New Time</DialogTitle>
          <DialogDescription>
            Suggest a different time for this appointment
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium">Appointment Details</h4>
            <p className="text-sm text-gray-600">
              Pet: {appointment.pets?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              Owner: {appointment.users?.first_name} {appointment.users?.last_name}
            </p>
            <p className="text-sm text-gray-600">
              Location: {appointment.address}
            </p>
            <p className="text-sm text-gray-600">
              Current: {appointment.date} {appointment.time_of_day}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposed-date">Proposed Date *</Label>
            <Input
              id="proposed-date"
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-range">Time Range *</Label>
            <Select value={proposedTimeRange} onValueChange={setProposedTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exact-time">Preferred Exact Time (Optional)</Label>
            <Input
              id="exact-time"
              type="time"
              value={proposedExactTime}
              onChange={(e) => setProposedExactTime(e.target.value)}
              placeholder="e.g., 10:30 AM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message to Pet Owner (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note explaining why you're proposing this time..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Proposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 