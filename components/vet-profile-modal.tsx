"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Mail, Award, Clock, Stethoscope } from "lucide-react"

interface VetProfileModalProps {
  vet: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    role: string
  } | null
  isOpen: boolean
  onClose: () => void
}

export function VetProfileModal({ vet, isOpen, onClose }: VetProfileModalProps) {
  if (!vet) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Veterinarian Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-teal-600">
                {vet.first_name?.[0] || 'V'}{vet.last_name?.[0] || 'D'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                Dr. {vet.first_name || 'Unknown'} {vet.last_name || 'Vet'}
              </h2>
              <p className="text-gray-600">Licensed Veterinarian</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              {vet.email}
            </div>
            {vet.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                {vet.phone}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 