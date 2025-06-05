"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Mail, Award, Clock, Stethoscope } from "lucide-react"

interface VetProfileModalProps {
  vet: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    role: string
    vet_profiles?: {
      specialties?: string[]
      bio?: string
      license_number?: string
      years_experience?: number
    }
  } | null
  isOpen: boolean
  onClose: () => void
}

export function VetProfileModal({ vet, isOpen, onClose }: VetProfileModalProps) {
  if (!vet) return null

  const specialties = vet.vet_profiles?.specialties || []
  const bio = vet.vet_profiles?.bio
  const licenseNumber = vet.vet_profiles?.license_number
  const yearsExperience = vet.vet_profiles?.years_experience

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
                {vet.first_name?.[0]}{vet.last_name?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                Dr. {vet.first_name} {vet.last_name}
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
            {licenseNumber && (
              <div className="flex items-center text-gray-600">
                <Award className="h-4 w-4 mr-2" />
                License: {licenseNumber}
              </div>
            )}
            {yearsExperience && (
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {yearsExperience} years experience
              </div>
            )}
          </div>

          {specialties.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Stethoscope className="h-4 w-4 mr-2" />
                Specialties
              </h3>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {bio && (
            <div>
              <h3 className="font-medium mb-2">About</h3>
              <p className="text-gray-600">{bio}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 