"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from "next/navigation"
import { ProfileFormData, UserProfile } from "@/types"

export default function ProfilePage() {
  const [formData, setFormData] = useState<ProfileFormData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createPagesBrowserClient())
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      setMessage(null)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error fetching user:", userError)
        setMessage({ type: 'error', text: 'Could not fetch user profile. Please try again.' })
        setLoading(false)
        return
      }

      if (!user) {
        console.log("No user found, redirecting to login.")
        router.push('/login')
        return
      }
      
      const initialFormData: ProfileFormData = {
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        city: user.user_metadata?.city || '',
        state: user.user_metadata?.state || '',
        postal_code: user.user_metadata?.postal_code || '',
        emergency_contact: user.user_metadata?.emergency_contact || '',
        emergency_phone: user.user_metadata?.emergency_phone || '',
        additional_info: user.user_metadata?.additional_info || ''
      }
      
      setFormData(initialFormData)
      setLoading(false)
    }

    fetchUserProfile()
  }, [supabase, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => prev ? { ...prev, [name]: value } as ProfileFormData : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!formData) {
      setMessage({ type: 'error', text: 'Form data is missing.' })
      return
    }

    setLoading(true)

    const { email, ...userMetadata }: ProfileFormData = formData

    const updatePayload: { email?: string; data: Partial<UserProfile> } = {
      data: { ...userMetadata }
    }

    const currentUserEmail = (await supabase.auth.getUser()).data.user?.email
    if (email && email !== currentUserEmail) {
      updatePayload.email = email
    }
    
    const { data, error } = await supabase.auth.updateUser(updatePayload)

    setLoading(false)

    if (error) {
      console.error("Error updating profile:", error)
      setMessage({ type: 'error', text: error.message || "Failed to update profile. Please try again." })
    } else {
      setMessage({ type: 'success', text: "Profile updated successfully!" })
      setIsEditing(false)
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">Loading...</div>
  }

  if (!formData && !loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
        <p className="mb-6 text-gray-600">Could not load profile data. Please try logging in again.</p>
        {message && (
          <div className={`my-4 p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    )
  }
  
  if (!formData) {
     return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">
        Error loading profile. Please refresh or try logging in again.
         {message && (
          <div className={`my-4 p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            {isEditing ? "Edit your personal information below" : "View and manage your personal information"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="first_name"
                  value={formData.first_name || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="last_name"
                  value={formData.last_name || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postal_code"
                  value={formData.postal_code || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium text-lg mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Name</Label>
                  <Input
                    id="emergencyContact"
                    name="emergency_contact"
                    value={formData.emergency_contact || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Phone</Label>
                  <Input
                    id="emergencyPhone"
                    name="emergency_phone"
                    value={formData.emergency_phone || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                name="additional_info"
                value={formData.additional_info || ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Any allergies, medical conditions, or other information we should know"
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditing(false)
                  setMessage(null)
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setIsEditing(true)
                  setMessage(null)
                }}
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
              >
                Edit Profile
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
