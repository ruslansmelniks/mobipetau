"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ProviderWaitlistDialog } from "@/components/provider-waitlist-dialog"
import { useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react'
import { redirectBasedOnRole } from '@/lib/utils'

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isWaitlistDialogOpen, setIsWaitlistDialogOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const router = useRouter()
  const supabase = useSupabaseClient()
  const { session, isLoading: sessionLoading } = useSessionContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password || !firstName || !lastName || !phone) {
      setError("Please fill in all required fields")
      return
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy")
      return
    }

    try {
      setIsLoading(true)
      // Real Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      console.log('Signup result:', data, error)
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
      // Insert user into users table with role 'pet_owner'
      const userId = data.user?.id
      if (userId) {
        const { error: userError, data: userData } = await supabase.from('users').insert([
          { id: userId, email, first_name: firstName, last_name: lastName, phone, role: 'pet_owner', created_at: new Date().toISOString() }
        ])
        console.log('User insert result:', userData, userError)
        if (userError) {
          setError(userError.message)
          setIsLoading(false)
          return
        }
        // Fetch the user role and redirect accordingly
        const { data: userRows } = await supabase.from('users').select('role').eq('id', userId).single();
        redirectBasedOnRole(userRows?.role, router);
      }
    } catch (err: any) {
      setError("An error occurred during registration. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('Session:', session, 'isLoading:', sessionLoading);
  }, [session, sessionLoading]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="#services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Services
          </Link>
          <Link href="#locations" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Locations
          </Link>
          <Link href="#book" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Book appointment
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsWaitlistDialogOpen(true)}
            className="text-sm font-medium text-gray-700 hover:text-teal-600"
          >
            Become a provider
          </button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#fcfcfd] border-[#d0d5dd] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] hover:bg-gray-50"
            asChild
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            asChild
          >
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* MobiPet Icon */}
          <div className="mb-6">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
                fill="#E6F7F5"
              />
              <path
                d="M29.6 15.2C29.6 19.4 26.2 22.8 22 22.8C17.8 22.8 14.4 19.4 14.4 15.2C14.4 11 17.8 7.6 22 7.6C26.2 7.6 29.6 11 29.6 15.2Z"
                fill="#00AF91"
              />
              <path
                d="M25.6 24.8C25.6 29 22.2 32.4 18 32.4C13.8 32.4 10.4 29 10.4 24.8C10.4 20.6 13.8 17.2 18 17.2C22.2 17.2 25.6 20.6 25.6 24.8Z"
                fill="#00AF91"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-center">Create your account</h1>
          <p className="text-gray-600 mb-8 text-center">Sign up to get started with MobiPet</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm w-full">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="firstName"
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full"
              />
              <Input
                id="lastName"
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full"
            />
            <div>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-start">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="ml-2 text-sm font-normal cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-teal-600 hover:text-teal-700">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-teal-600 hover:text-teal-700">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] h-11"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
      <ProviderWaitlistDialog open={isWaitlistDialogOpen} onOpenChange={setIsWaitlistDialogOpen} />
    </div>
  )
}
