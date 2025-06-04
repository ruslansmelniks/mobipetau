"use client"

import { useState } from "react"
import Image from "next/image"
import { 
  Calendar, Clock, MapPin, User, DollarSign, 
  FileText, AlertCircle, CheckCircle, XCircle,
  Phone, Mail, MessageSquare
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getStatusLabel } from "@/lib/appointment-statuses"
import Link from "next/link"

interface AppointmentDetailsModalProps {
  appointment: any
  isOpen: boolean
  onClose: () => void
}

export function AppointmentDetailsModal({ 
  appointment, 
  isOpen, 
  onClose 
}: AppointmentDetailsModalProps) {
  if (!appointment) return null

  const status = getStatusLabel(appointment.status)
  const hasVet = appointment.vet_id && appointment.vet
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Appointment Details</DialogTitle>
          <DialogDescription>
            Booking ID: {appointment.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            {appointment.created_at && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Booked on</p>
                <p className="text-sm">{new Date(appointment.created_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Pet Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Pet Information
            </h3>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-4">
                {appointment.pets?.image && (
                  <Image
                    src={appointment.pets.image}
                    alt={appointment.pets.name || 'Pet'}
                    width={64}
                    height={64}
                    className="rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{appointment.pets?.name || 'Unknown Pet'}</p>
                  <p className="text-sm text-gray-600">
                    {appointment.pets?.type} {appointment.pets?.breed && `• ${appointment.pets.breed}`}
                  </p>
                  {appointment.pets?.age && (
                    <p className="text-sm text-gray-500">Age: {appointment.pets.age}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Schedule */}
          <div>
            <h3 className="font-semibold mb-3">Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-teal-500 mr-3" />
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium">
                  {appointment.date ? new Date(appointment.date).toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-teal-500 mr-3" />
                <span className="text-gray-600">Time:</span>
                <span className="ml-2 font-medium">{appointment.time_slot || 'Not set'}</span>
              </div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-teal-500 mr-3 mt-1" />
                <div className="flex-1">
                  <span className="text-gray-600">Location:</span>
                  <p className="font-medium">{appointment.address || 'Not specified'}</p>
                  {appointment.additional_info && (
                    <p className="text-sm text-gray-500 mt-1">
                      Additional info: {appointment.additional_info}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Veterinarian Information */}
          <div>
            <h3 className="font-semibold mb-3">Veterinarian</h3>
            {hasVet ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Dr. {appointment.vet.first_name} {appointment.vet.last_name}
                    </p>
                    {appointment.vet.phone && (
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        {appointment.vet.phone}
                      </p>
                    )}
                    {appointment.vet.email && (
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Mail className="h-3 w-3 mr-1" />
                        {appointment.vet.email}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-yellow-800">
                    {appointment.status === 'waiting_for_vet' 
                      ? 'Waiting for a veterinarian to accept this appointment'
                      : 'No veterinarian assigned yet'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Services & Payment */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Services & Payment
            </h3>
            <div className="bg-white border rounded-lg p-4">
              {appointment.services && appointment.services.length > 0 ? (
                <div className="space-y-2">
                  {appointment.services.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{service.name}</span>
                      <span className="font-medium">${service.price}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${appointment.total_price || 0}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No services listed</p>
              )}
              
              {appointment.payment_status && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {appointment.payment_status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pet Owner's Notes */}
          {appointment.notes && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Issue Description
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            </div>
          )}

          {/* Time Proposal (if applicable) */}
          {appointment.status === 'time_proposed' && appointment.proposed_time && (
            <div>
              <h3 className="font-semibold mb-3">Proposed Time Change</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 mb-2">
                  The veterinarian has proposed a new time for this appointment:
                </p>
                <div className="bg-white rounded p-3 space-y-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                    <span>{appointment.proposed_date ? new Date(appointment.proposed_date).toLocaleDateString() : 'Date not specified'}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-600 mr-2" />
                    <span>{appointment.proposed_time}</span>
                  </div>
                  {appointment.proposed_message && (
                    <p className="text-sm text-gray-600 mt-2">
                      Message: {appointment.proposed_message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="outline"
              asChild
            >
              <Link href={`/portal/messages?appointment=${appointment.id}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Vet
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 