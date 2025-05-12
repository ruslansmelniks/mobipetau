"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle } from "lucide-react"

interface ProviderWaitlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProviderWaitlistDialog({ open, onOpenChange }: ProviderWaitlistDialogProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!name) {
      setError("Please enter your name")
      return
    }

    try {
      setIsSubmitting(true)

      // In a real app, you would call an API to add the email to your waitlist
      // For demo purposes, we'll simulate a successful submission after a delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsSubmitted(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset the form state when the dialog is closed
    if (!isSubmitting) {
      onOpenChange(false)

      // Reset form after dialog animation completes
      setTimeout(() => {
        setEmail("")
        setName("")
        setError("")
        setIsSubmitted(false)
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle>Join our Vet Provider Waitlist</DialogTitle>
              <DialogDescription>
                We're currently accepting new veterinarians by invitation only. Join our waitlist to be notified when we
                open applications in your area.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                >
                  {isSubmitting ? "Submitting..." : "Join Waitlist"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-teal-600" />
            </div>
            <DialogTitle className="mb-2">Thank you for your interest!</DialogTitle>
            <DialogDescription>
              We've added you to our waitlist. We'll reach out when we're ready to welcome new veterinarians in your
              area.
            </DialogDescription>
            <Button
              onClick={handleClose}
              className="mt-6 bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
