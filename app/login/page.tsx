"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [supabase] = useState(() => createPagesBrowserClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setIsLoading(true)
      
      // TEMP: localStorage auth workaround - START
      // // For the demo, check if user exists in localStorage
      // const authStr = localStorage.getItem('mobipet_auth')
      // if (!authStr) {
      //   setError("Invalid email or password")
      //   setIsLoading(false); // Ensure loading state is reset
      //   return
      // }

      // try {
      //   const auth = JSON.parse(authStr)
      //   // Note: This demo login does not check the password, only email existence.
      //   if (!auth || !auth.user || auth.user.email !== email) {
      //     setError("Invalid email or password")
      //     setIsLoading(false); // Ensure loading state is reset
      //     return
      //   }

      //   // Update the session with new expiration
      //   auth.session = {
      //     ...auth.session,
      //     expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      //   };
        
      //   localStorage.setItem('mobipet_auth', JSON.stringify(auth));
      //   // TEMP: localStorage auth workaround - END
      //   router.push('/portal/bookings')
      // } catch (err) {
      //   console.error('Auth parsing error:', err)
      //   setError("An error occurred during login")
      // }

      // Supabase signin
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Supabase SignIn Error:", signInError);
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      // On successful login, Supabase sets a session cookie.
      // The onAuthStateChange listener in SupabaseProvider or middleware should handle redirection.
      // For now, explicitly redirecting as per previous logic.
      // We might want to fetch user role here and redirect accordingly, or let middleware handle it.
      router.push('/portal/bookings'); 

    } catch (err: any) { // Catches errors from the try block itself, not from Supabase client unless it throws
      console.error('Login error (catch block):', err)
      setError(err.message || "An unexpected error occurred during login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold mb-2 text-center">Log into your account</h1>
          <p className="text-gray-600 mb-8 text-center">Welcome back! Please enter your details.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm w-full">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 w-full">
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

            <Button
              type="submit"
              className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] h-11"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Continue with email"}
            </Button>
            
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500">
                Note: This is a demo version with local authentication only.
              </p>
            </div>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign up
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Forgot your password?{" "}
              <Link href="/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium">
                Restore
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
    </div>
  );
}
