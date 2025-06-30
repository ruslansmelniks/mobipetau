"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BookingSteps } from "@/components/booking-steps"
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { SmartLogo } from "@/components/smart-logo"

export default function AddPet() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [petImage, setPetImage] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // --- DEBUG PETS SCHEMA ---
  useEffect(() => {
    if (!user || process.env.NODE_ENV !== 'development') return;
    // Optionally, keep a minimal select for troubleshooting
    supabase
      .from('pets')
      .select('*')
      .limit(1)
      .then(({data, error}) => {
        if (error) {
          console.error("Pets table select error:", error);
        }
      });
  }, [user, supabase]);
  // --- END DEBUG PETS SCHEMA ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setPetImage(imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.log("No user found");
      return;
    }
    setSaving(true);
    console.log("Starting image upload...");
    let imageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('image').upload(filePath, imageFile, { upsert: true });
      if (uploadError) {
        setSaving(false);
        alert('Failed to upload image: ' + uploadError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('image').getPublicUrl(filePath);
      imageUrl = publicUrlData?.publicUrl || null;
      console.log("Image uploaded, url:", imageUrl);
    }
    console.log("Inserting pet...");
    const { error } = await supabase.from('pets').insert({
      owner_id: user.id,
      name: petName,
      type: species,
      breed: breed,
      age: age ? Number(age) : null,
      age_unit: ageUnit,
      weight: weight ? Number(weight) : null,
      gender: gender,
      image: imageUrl,
    });
    setSaving(false);
    if (!error) {
      console.log("Pet added, redirecting...");
      router.push('/book');
    } else {
      console.error('Failed to add pet:', error);
      alert('Failed to add pet: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex items-center">
            <SmartLogo />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-8">
        <BookingSteps currentStep="pet" />

        <div className="max-w-2xl mx-auto mt-12">
          <h1 className="text-3xl font-bold text-center mb-2">Add a new pet</h1>
          <p className="text-center text-gray-600 mb-8">Please provide your pet's information below.</p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border">
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border-2 border-dashed border-gray-300">
                {petImage ? (
                  <Image
                    src={petImage || "/placeholder.svg"}
                    alt="Pet preview"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <Label
                htmlFor="pet-image"
                className="cursor-pointer text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Upload pet photo
              </Label>
              <Input id="pet-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pet-name">Pet Name *</Label>
                <Input id="pet-name" placeholder="Enter your pet's name" required value={petName} onChange={e => setPetName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet-species">Species *</Label>
                <Select required value={species} onValueChange={setSpecies}>
                  <SelectTrigger id="pet-species">
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="rabbit">Rabbit</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="reptile">Reptile</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet-breed">Breed</Label>
                <Input id="pet-breed" placeholder="Enter breed (if applicable)" value={breed} onChange={e => setBreed(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet-age">Age</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input id="pet-age" type="number" min="0" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} />
                  <Select value={ageUnit} onValueChange={setAgeUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Years</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet-weight">Weight (lbs)</Label>
                <Input id="pet-weight" type="number" min="0" step="0.1" placeholder="Enter weight" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet-gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="pet-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="ghost" className="flex items-center gap-2" asChild>
                <Link href="/book">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button
                type="submit"
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Pet'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
