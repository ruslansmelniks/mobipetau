"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProviderWaitlistDialog } from "@/components/provider-waitlist-dialog"
import { SmartLogo } from "@/components/smart-logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isWaitlistDialogOpen, setIsWaitlistDialogOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    try {
      setIsLoading(true)

      // In a real app, you would call your password reset API here
      // For demo purposes, we'll simulate a successful request after a delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsSubmitted(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
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
          <Link href="#services" className="text-sm font-medium text-gray-700 hover:text-teal-600">
            Services
          </Link>
                      <Link href="/locations" className="text-sm font-medium text-gray-700 hover:text-teal-600">
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

          {!isSubmitted ? (
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Forgot password?</h1>
              <p className="text-gray-600 mb-8 text-center">No worries, we'll send you reset instructions</p>

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

                <Button
                  type="submit"
                  className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Reset password"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check your email</h1>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <span className="font-medium">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or{" "}
                <button className="text-teal-600 hover:text-teal-700 font-medium" onClick={() => setIsSubmitted(false)}>
                  try another email address
                </button>
              </p>
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                Back to login
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Image src="/logo.png" alt="MobiPet Logo" width={120} height={40} className="h-auto" />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
      <ProviderWaitlistDialog open={isWaitlistDialogOpen} onOpenChange={setIsWaitlistDialogOpen} />
    </div>
  )
}
