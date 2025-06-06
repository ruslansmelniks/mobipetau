"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { logger } from "@/lib/logger"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);
      
      logger.info('Attempting login', { email });
      
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        logger.error('Login failed', { 
          email,
          error: signInError.message 
        });
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        logger.error('No session returned after login');
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      logger.info('Login successful', { 
        userId: data.user?.id,
        email: data.user?.email,
        role: data.user?.user_metadata?.role || data.user?.app_metadata?.role
      });

      // Get the fresh session to ensure it's properly set
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        logger.error('Failed to establish session after login', { 
          sessionError: sessionError?.message 
        });
        setError("Login successful but failed to establish session. Please try again.");
        setIsLoading(false);
        return;
      }

      // Check user role from metadata
      const userRole = data.user?.user_metadata?.role || data.user?.app_metadata?.role;
      let redirectPath = '/portal/bookings';
      if (userRole === 'admin') {
        redirectPath = '/admin';
      } else if (userRole === 'vet') {
        redirectPath = '/vet';
      }

      logger.info('Redirecting user after login', {
        userId: data.user?.id,
        role: userRole,
        redirectPath
      });

      // Redirect directly to the appropriate page
      router.push(redirectPath);
      setIsLoading(false);
      return;
      
    } catch (err: any) {
      logger.error('Unexpected login error', {
        email,
        error: err.message
      });
      setError(err.message || "An unexpected error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold mb-2 text-center">Sign in to your account</h1>
          <p className="text-gray-600 mb-8 text-center">Welcome back! Please enter your details</p>

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
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
                  Sign up
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
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
