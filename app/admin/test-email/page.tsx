"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function TestEmailPage() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const sendTestEmail = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Test email sent successfully!",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test Email Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={sendTestEmail}
          disabled={!email || sending}
          className="w-full"
        >
          {sending ? "Sending..." : "Send Test Email"}
        </Button>
      </CardContent>
    </Card>
  )
} 