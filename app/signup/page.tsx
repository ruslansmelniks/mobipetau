"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function SignupPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [supabase] = useState(() => createPagesBrowserClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !firstName || !lastName || !phone) {
      setError("Please fill in all required fields");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    try {
      setIsLoading(true);
      // Real Supabase signup
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: "pet_owner", // Default role
          },
        },
      });

      if (signUpError) {
        console.error("Supabase Signup Error:", signUpError);
        setError(signUpError.message || "Failed to create account. Please try again.");
        return;
      }
      
      // Check if user object exists and if identities array is empty (means email likely already exists and is confirmed)
      // Note: Supabase behavior for existing unconfirmed vs confirmed emails can vary based on project settings.
      // This check might need adjustment based on your specific Supabase email confirmation settings.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
         setError("This email address may already be in use. Please try logging in or use a different email.");
         return;
      }     
      
      // If signup is successful and a user object is returned (even if email confirmation is pending)
      // redirect directly to dashboard. The middleware should handle session state.
      // If email confirmation is ON and STRICTLY required before login, this redirect might lead
      // to the user being bounced back to login by the middleware if the session isn't active yet.
      // For a smoother UX with email confirmation, you might redirect to a page saying "Check your email".
      // For now, per request, redirecting to dashboard:
      console.log("Supabase signup successful, redirecting to /portal/bookings. User:", data.user);
      router.push("/portal/bookings");

    } catch (err: any) {
      console.error("Signup error (catch block):", err);
      setError(err.message || "An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Services
          </Link>
          <Link href="/services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Locations
          </Link>
          <Link href="/book" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Book appointment
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
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
                onCheckedChange={(checked) => setAgreeTerms(!!checked)}
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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
