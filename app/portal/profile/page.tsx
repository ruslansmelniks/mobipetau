"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { useUser, useSupabaseClient, useSessionContext } from "@supabase/auth-helpers-react"

export default function ProfilePage() {
  console.log('ProfilePage component loaded')
  const { isLoading } = useSessionContext();
  const user = useUser();
  const supabase = useSupabaseClient();
  const [formData, setFormData] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [loading, setLoading] = useState(true)

  // Minimal profile form state (always defined at top level)
  const [formState, setFormState] = useState({ first_name: "", last_name: "", phone: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const handleMinimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const fetchProfile = async () => {
    if (!user) return;
    try {
      let { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, email, phone, address, city, state, postal_code, emergency_contact, emergency_phone, additional_info")
        .eq("id", user.id)
        .maybeSingle();
      console.log("Profile fetch result", { data, error });
      if (!data) {
        // Only try to insert if error is not a permissions error
        if (error && error.code === '42501') { // insufficient_privilege
          setFormData(null);
          setLoading(false);
          setSubmitError("You do not have permission to view your profile. Please contact support.");
          return;
        }
        // Row missing: insert fallback
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          phone: user.user_metadata?.phone || "",
          role: "pet_owner",
          created_at: new Date().toISOString(),
        });
        if (insertError) {
          if (insertError.code === '409') {
            // Row already exists, fetch again
            ({ data, error } = await supabase
              .from("users")
              .select("first_name, last_name, email, phone, address, city, state, postal_code, emergency_contact, emergency_phone, additional_info")
              .eq("id", user.id)
              .maybeSingle());
            if (data) {
              setFormData(data);
              setLoading(false);
              return;
            }
          }
          setFormData(null);
          setLoading(false);
          setSubmitError("Could not create your profile. Please try reloading the page or contact support if the problem persists.");
          return;
        }
        // Try fetching again
        ({ data, error } = await supabase
          .from("users")
          .select("first_name, last_name, email, phone, address, city, state, postal_code, emergency_contact, emergency_phone, additional_info")
          .eq("id", user.id)
          .maybeSingle());
      }
      if (error) {
        setFormData(null);
        setLoading(false);
        setSubmitError("Could not load your profile. Please try reloading the page or contact support if the problem persists.");
        return;
      }
      setFormData(data);
    } catch (error) {
      setFormData(null);
      setSubmitError("Unexpected error loading profile. Please try reloading the page or contact support.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Profile useEffect running", { user });
    if (!user) {
      console.log("No user found, returning early");
      return;
    }
    setLoading(true);
    console.log("Fetching profile for user:", user.id);
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkDraft = async () => {
      const { data: draft } = await supabase
        .from('appointments')
        .select('id')
        .eq('pet_owner_id', user.id)
        // .eq('status', 'pending') // TEMP: remove status filter for debugging
        .maybeSingle();
      if (draft) {
        setShowDraftBanner(true);
        setDraftId(draft.id);
      }
    };
    checkDraft();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would save the data to your backend here
    setIsEditing(false)
    alert("Profile updated successfully!")
  }

  if (isLoading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">Loading session...</div>;
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">Loading...</div>
  }

  if (!formData) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Could not load your profile</h2>
        <p className="mb-6 text-gray-600">{submitError || "Please try reloading the page or contact support if the problem persists."}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {showDraftBanner && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded mb-6 flex items-center justify-between">
          <span>You have an incomplete booking. Would you like to resume or discard it?</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/book'}>Resume</Button>
            <Button variant="destructive" onClick={async () => {
              if (draftId) {
                await supabase.from('appointments').delete().eq('id', draftId);
                setShowDraftBanner(false);
              }
            }}>Discard</Button>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

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
                required
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
                  required
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
                  required
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
                  required
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
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
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
