"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): string => {
  if (!dateOfBirth) return ""

  const birthDate = new Date(dateOfBirth)
  const today = new Date()

  let years = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--
  }

  if (years < 1) {
    const months = years * 12 + monthDiff
    return `${months} months`
  }

  return `${years} years`
}

// Add or update the age calculation function
function calculateAgeAndUnit(dateOfBirth: string): { age: number | null, age_unit: 'years' | 'months' } {
  if (!dateOfBirth) return { age: null, age_unit: 'years' };
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  if (years < 1) {
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    return { age: Math.max(0, months), age_unit: 'months' };
  }
  return { age: years, age_unit: 'years' };
}

// Form steps for the wizard
const formSteps = [
  { id: "basic", title: "Basic Information" },
  { id: "details", title: "Pet Details" },
  { id: "behavior", title: "Behavior & Notes" },
]

export default function PetsPage() {
  const user = useUser()
  const supabase = useSupabaseClient()
  const [pets, setPets] = useState<any[]>([])
  const [petToEdit, setPetToEdit] = useState<any | null>(null)
  const [petToDelete, setPetToDelete] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [petImage, setPetImage] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        setPets(data || [])
        setLoading(false)
      })
  }, [user])

  const hasPets = pets.length > 0

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Blob URL for preview
      const imageUrl = URL.createObjectURL(file)
      setPetImage(imageUrl)
      setImageFile(file) // Save the file for upload
      setFormData({ ...formData, image: imageUrl })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleRadioChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleAddPet = async () => {
    if (!user) {
      alert('User not found. Please log in again.');
      return;
    }
    let uploadedImageUrl = null
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${formData.name || 'pet'}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('image')
        .upload(fileName, imageFile)
      if (error) {
        alert('Failed to upload image: ' + error.message)
        return // Do not proceed if upload fails
      } else if (data) {
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('image')
          .getPublicUrl(data.path)
        uploadedImageUrl = publicUrlData?.publicUrl
      }
    }
    const { age, age_unit } = calculateAgeAndUnit(formData.dateOfBirth || "");
    const newPet = {
      name: formData.name || "",
      type: formData.type || "",
      breed: formData.breed || "",
      date_of_birth: formData.dateOfBirth || "",
      age: age,
      age_unit: age_unit,
      weight: formData.weight || "",
      gender: formData.gender || "Male",
      desexed: formData.desexed || "No",
      microchip: formData.microchip || "",
      image: uploadedImageUrl || petImage || "/placeholder.svg?key=pet",
      temperament: formData.temperament || "",
      reactive: formData.reactive || "No",
      additional_comments: formData.additionalComments || "",
      medical_history: formData.additionalComments || "",
      owner_id: user.id,
    }
    console.log('Saving pet with image:', uploadedImageUrl)
    console.log('Pet data being saved:', newPet)
    const { data: insertedPet, error: insertError } = await supabase
      .from('pets')
      .insert([newPet])
      .select()
      .single();
    if (insertError) {
      alert('Failed to save pet: ' + insertError.message);
      return;
    }
    console.log('Pet saved:', insertedPet)
    setPets([...pets, insertedPet]);
    setIsAddDialogOpen(false)
    setPetImage(null)
    setImageFile(null)
    setCurrentStep(0)
    setFormData({})
  }

  const handleEditPet = async () => {
    if (!petToEdit) return
    let uploadedImageUrl = null
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${formData.name || 'pet'}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('image')
        .upload(fileName, imageFile)
      if (error) {
        alert('Failed to upload image: ' + error.message)
        return // Do not proceed if upload fails
      } else if (data) {
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('image')
          .getPublicUrl(data.path)
        uploadedImageUrl = publicUrlData?.publicUrl
      }
    }
    const { age, age_unit } = calculateAgeAndUnit(formData.dateOfBirth || petToEdit.date_of_birth || "");
    const updatedPet = {
      name: formData.name || petToEdit.name,
      type: formData.type || petToEdit.type,
      breed: formData.breed || petToEdit.breed,
      date_of_birth: formData.dateOfBirth || petToEdit.date_of_birth,
      age: age,
      age_unit: age_unit,
      weight: formData.weight || petToEdit.weight,
      gender: formData.gender || petToEdit.gender,
      desexed: formData.desexed || petToEdit.desexed,
      microchip: formData.microchip || petToEdit.microchip,
      image: uploadedImageUrl || petImage || petToEdit.image,
      temperament: formData.temperament || petToEdit.temperament,
      reactive: formData.reactive || petToEdit.reactive,
      additional_comments: formData.additionalComments || petToEdit.additionalComments,
      medical_history: formData.additionalComments || petToEdit.additionalComments,
    }
    console.log('Updating pet with image:', uploadedImageUrl)
    console.log('Pet data being updated:', updatedPet)
    const { data: updatedPetData, error: updateError } = await supabase
      .from('pets')
      .update(updatedPet)
      .eq('id', petToEdit.id)
      .select()
      .single();
    if (updateError) {
      alert('Failed to update pet: ' + updateError.message);
      return;
    }
    console.log('Pet updated:', updatedPetData)
    setPets(pets.map((pet) => (pet.id === petToEdit.id ? updatedPetData : pet)));
    setIsEditDialogOpen(false)
    setPetToEdit(null)
    setPetImage(null)
    setImageFile(null)
    setCurrentStep(0)
    setFormData({})
  }

  const handleDeletePet = () => {
    if (!petToDelete) return
    setPets(pets.filter((pet) => pet.id !== petToDelete))
    setIsDeleteDialogOpen(false)
    setPetToDelete(null)
  }

  const openEditDialog = (pet: any) => {
    setPetToEdit(pet)
    setPetImage(null)
    setFormData({
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      dateOfBirth: pet.date_of_birth,
      weight: pet.weight,
      gender: pet.gender,
      desexed: pet.desexed,
      microchip: pet.microchip,
      temperament: pet.temperament,
      reactive: pet.reactive,
      additionalComments: pet.additional_comments,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (petId: string) => {
    setPetToDelete(petId)
    setIsDeleteDialogOpen(true)
  }

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, formSteps.length - 1))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const isStepComplete = (step: number) => {
    if (step === 0) {
      // Basic info step requires name and type
      return !!formData.name && !!formData.type
    }
    return true // Other steps are optional
  }

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-6">
        {formSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStep
                  ? "border-teal-500 bg-teal-50 text-teal-600"
                  : "border-gray-300 bg-white text-gray-400"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < formSteps.length - 1 && (
              <div className={`w-12 h-1 ${index < currentStep ? "bg-teal-500" : "bg-gray-200"}`}></div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderBasicInfoStep = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border-2 border-dashed border-gray-300">
            {petImage || (petToEdit && petToEdit.image) ? (
              <Image
                src={petImage || (petToEdit && petToEdit.image) || "/placeholder.svg"}
                alt="Pet preview"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <Plus className="h-8 w-8 mx-auto mb-1" />
                <span className="text-xs">Add photo</span>
              </div>
            )}
          </div>
          <Label htmlFor="pet-image" className="cursor-pointer text-teal-600 hover:text-teal-700 font-medium text-sm">
            {petImage || (petToEdit && petToEdit.image) ? "Change photo" : "Upload pet photo"}
          </Label>
          <Input id="pet-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">What is their name?</Label>
            <Input
              id="name"
              name="name"
              value={formData.name || ""}
              onChange={handleInputChange}
              placeholder="Please add"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">What species?</Label>
            <Select
              name="type"
              value={formData.type || ""}
              onValueChange={(value) => handleSelectChange("type", value)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
                <SelectItem value="Rabbit">Rabbit</SelectItem>
                <SelectItem value="Bird">Bird</SelectItem>
                <SelectItem value="Reptile">Reptile</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">What is their breed?</Label>
            <Input
              id="breed"
              name="breed"
              value={formData.breed || ""}
              onChange={handleInputChange}
              placeholder="Please add"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth || ""}
              onChange={handleInputChange}
              placeholder="DD/MM/YYYY"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderDetailsStep = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Are they male or female?</Label>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="male"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={() => handleRadioChange("gender", "Male")}
                  className="mr-2"
                />
                <Label htmlFor="male" className="font-normal">
                  Male
                </Label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="female"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={() => handleRadioChange("gender", "Female")}
                  className="mr-2"
                />
                <Label htmlFor="female" className="font-normal">
                  Female
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Desexed?</Label>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="desexed-no"
                  name="desexed"
                  value="No"
                  checked={formData.desexed === "No"}
                  onChange={() => handleRadioChange("desexed", "No")}
                  className="mr-2"
                />
                <Label htmlFor="desexed-no" className="font-normal">
                  No
                </Label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="desexed-yes"
                  name="desexed"
                  value="Yes"
                  checked={formData.desexed === "Yes"}
                  onChange={() => handleRadioChange("desexed", "Yes")}
                  className="mr-2"
                />
                <Label htmlFor="desexed-yes" className="font-normal">
                  Yes
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Approximate weight (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              min="0"
              step="0.1"
              value={formData.weight || ""}
              onChange={handleInputChange}
              placeholder="Please add"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="microchip">Microchip number (if applicable)</Label>
            <Input
              id="microchip"
              name="microchip"
              value={formData.microchip || ""}
              onChange={handleInputChange}
              placeholder="982009xxxxxxxxx"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderBehaviorStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="temperament">Temperament</Label>
          <Textarea
            id="temperament"
            name="temperament"
            value={formData.temperament || ""}
            onChange={handleInputChange}
            placeholder="Please let us know about your pet temperament"
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-medium">Can your animal be reactive/aggressive to strangers?</Label>
          <div className="flex gap-4 pt-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="reactive-no"
                name="reactive"
                value="No"
                checked={formData.reactive === "No"}
                onChange={() => handleRadioChange("reactive", "No")}
                className="mr-2"
              />
              <Label htmlFor="reactive-no" className="font-normal">
                No
              </Label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="reactive-yes"
                name="reactive"
                value="Yes"
                checked={formData.reactive === "Yes"}
                onChange={() => handleRadioChange("reactive", "Yes")}
                className="mr-2"
              />
              <Label htmlFor="reactive-yes" className="font-normal">
                Yes
              </Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalComments">Additional comments</Label>
          <Textarea
            id="additionalComments"
            name="additionalComments"
            value={formData.additionalComments || ""}
            onChange={handleInputChange}
            placeholder="Please add any useful information"
            className="min-h-[100px]"
          />
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md border border-gray-200">
          You must be upfront about your animal's behaviour around strangers for the safety of our vets. If you think
          your animal may be resistant or reactive to handling, please outline this clearly so the vet allocated can
          make the appropriate preparations for your home visit
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep()
      case 1:
        return renderDetailsStep()
      case 2:
        return renderBehaviorStep()
      default:
        return null
    }
  }

  const renderStepButtons = () => {
    const isLastStep = currentStep === formSteps.length - 1
    const isFirstStep = currentStep === 0

    return (
      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep}
          className={isFirstStep ? "invisible" : ""}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={petToEdit ? handleEditPet : handleAddPet}
            className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
          >
            {petToEdit ? "Save Changes" : "Add pet"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!isStepComplete(currentStep)}
            className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
          >
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto py-12 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Pets</h1>
      {!hasPets && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-4 py-3 mb-6">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span>Please add at least one pet to book an appointment.</span>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              setCurrentStep(0)
              setFormData({})
              setPetImage(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]">
              <Plus className="mr-2 h-4 w-4" /> Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add a pet</DialogTitle>
              <DialogDescription>
                {formSteps[currentStep].title} - Step {currentStep + 1} of {formSteps.length}
              </DialogDescription>
            </DialogHeader>
            {renderStepIndicator()}
            {renderCurrentStep()}
            {renderStepButtons()}
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No pets added yet</h2>
          <p className="text-gray-600 mb-6">Add your pets to manage their health records and appointments.</p>
          <Button
            className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Your First Pet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <Card key={pet.id} className="overflow-hidden">
              <div className="h-48 relative">
                <Image src={pet.image || "/placeholder.svg"} alt={pet.name} fill className="object-cover" />
              </div>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-1">{pet.name}</h2>
                <p className="text-gray-500 mb-4">
                  {pet.breed} • {pet.age} {pet.age_unit}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span>{pet.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Weight:</span>
                    <span>{pet.weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender:</span>
                    <span>{pet.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Desexed:</span>
                    <span>{pet.desexed || "No"}</span>
                  </div>
                  {pet.microchip && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Microchip:</span>
                      <span className="truncate ml-2 max-w-[120px]">{pet.microchip}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between p-6 pt-0">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(pet)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openDeleteDialog(pet.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Pet Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setCurrentStep(0)
            setFormData({})
            setPetImage(null)
            setPetToEdit(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit pet</DialogTitle>
            <DialogDescription>
              {formSteps[currentStep].title} - Step {currentStep + 1} of {formSteps.length}
            </DialogDescription>
          </DialogHeader>
          {renderStepIndicator()}
          {renderCurrentStep()}
          {renderStepButtons()}
        </DialogContent>
      </Dialog>

      {/* Delete Pet Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your pet's profile and all associated records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePet} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
