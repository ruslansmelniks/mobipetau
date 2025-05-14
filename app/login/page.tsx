"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSessionContext } from '@supabase/auth-helpers-react'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState(false)
  
  const supabase = createClientComponentClient()
  const { session, isLoading: sessionLoading } = useSessionContext()

  // Check if we're in the login success state already based on localStorage
  useEffect(() => {
    const success = localStorage.getItem('mobipet_login_success') === 'true'
    if (success && session?.user) {
      setLoginSuccess(true)
    } else {
      setLoginSuccess(false)
      localStorage.removeItem('mobipet_login_success') // Clear flag if not authenticated
    }
  }, [session, sessionLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setIsLoading(true)
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message || "Invalid email or password")
        return
      }

      // Store success in localStorage and set state
      localStorage.setItem('mobipet_login_success', 'true')
      setLoginSuccess(true)
      
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to manually navigate to dashboard
  const goToDashboard = () => {
    localStorage.removeItem('mobipet_login_success')
    window.location.href = '/portal/bookings'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto py-4 px-4">
          <Link href="/" className="flex items-center justify-center md:justify-start">
            <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex rounded-full p-3 bg-teal-50 mb-4">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#E6F7F5"/>
                <path d="M29.6 15.2C29.6 19.4 26.2 22.8 22 22.8C17.8 22.8 14.4 19.4 14.4 15.2C14.4 11 17.8 7.6 22 7.6C26.2 7.6 29.6 11 29.6 15.2Z" fill="#00AF91"/>
                <path d="M25.6 24.8C25.6 29 22.2 32.4 18 32.4C13.8 32.4 10.4 29 10.4 24.8C10.4 20.6 13.8 17.2 18 17.2C22.2 17.2 25.6 20.6 25.6 24.8Z" fill="#00AF91"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Log into your account</h1>
            <p className="text-gray-600 mt-2">Welcome back! Please enter your details.</p>
          </div>

          {loginSuccess ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="p-4 mb-6 rounded text-sm bg-green-50 text-green-600 border border-green-200">
                <p className="font-medium mb-2">Login successful! Redirecting to your dashboard...</p>
                <p>If you're not redirected automatically, please click the button below.</p>
              </div>
              <Button
                onClick={goToDashboard}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              {error && (
                <div className="p-4 mb-6 rounded text-sm bg-red-50 text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                    autoComplete="username"
                    disabled={isLoading}
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
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white h-10"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </Button>
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
          )}
        </div>
      </main>

      <footer className="py-6 text-center border-t mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
