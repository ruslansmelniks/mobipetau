"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { logger } from "@/lib/logger"
import { SmartLogo } from "@/components/smart-logo"
import type { AuthSession } from '@supabase/supabase-js'

export default function LoginPage() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const supabase = createClientComponentClient()

  // Check for error parameters in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      
      if (errorParam) {
        console.log('[LoginPage] Error parameter found:', errorParam);
        switch (errorParam) {
          case 'auth_callback_failed':
            setError('Authentication failed. Please try logging in again.');
            break;
          case 'unexpected_error':
            setError('An unexpected error occurred. Please try again.');
            break;
          default:
            setError('Login failed. Please try again.');
        }
        
        // Clean up the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  useEffect(() => {
    // Check if already logged in on mount
    const checkSession = async () => {
      console.log('[LoginPage] Checking session on mount...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[LoginPage] Session check result:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userRole: session?.user?.user_metadata?.role
      })
      
      if (session && !isRedirecting) {
        console.log('[LoginPage] User already logged in, redirecting to portal')
        setIsRedirecting(true)
        router.push('/portal/bookings')
      }
    }
    checkSession()
  }, [router, isRedirecting, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Enhanced validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    console.log('Form state:', { email, password: '***' });
    console.log('Submitting login form...');

    try {
      setIsLoading(true);
      const supabase = createClientComponentClient();
      
      console.log('Attempting Supabase sign in...');
      
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log('Supabase response:', { 
        hasData: !!data, 
        hasUser: !!data?.user, 
        error: signInError?.message 
      });

      if (signInError) {
        console.error('Supabase login error:', signInError);
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        console.error('No user data returned from Supabase');
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log('Login successful for user:', data.user.email);
      console.log('User role:', data.user.user_metadata?.role);

      // Get user role
      const userRole = data.user.user_metadata?.role || 'pet_owner';
      const redirectPath = userRole === 'admin' ? '/admin' : 
                          userRole === 'vet' ? '/vet' : 
                          '/portal/bookings';

      console.log('Redirecting to:', redirectPath);

      // CRITICAL: Force a hard navigation to ensure cookies are properly set
      window.location.replace(redirectPath);
    } catch (err: any) {
      console.error('Login form error:', err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <SmartLogo />
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Services
          </Link>
          <Link href="/services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Locations
          </Link>
          <Link href="/portal/bookings" className="text-sm font-medium text-gray-700 hover:text-teal-600">
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
              onClick={() => console.log('[LoginPage] Submit button clicked')}
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
              <Image 
                src="/logo.png" 
                alt="MobiPet Logo" 
                width={96} 
                height={32} 
                className="h-[32px] w-auto" 
                priority
              />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
