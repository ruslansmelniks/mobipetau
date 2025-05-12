"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VetPortalTabs } from "@/components/vet-portal-tabs"
import { useState } from "react"

export default function VetPortalLayout({ children }: { children: React.ReactNode }) {
  const [hasNotifications, setHasNotifications] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
                  hasNotifications ? "bg-amber-50" : ""
                }`}
                aria-label="Notifications"
                onClick={() => setHasNotifications(!hasNotifications)}
              >
                <Bell className={`h-5 w-5 ${hasNotifications ? "text-amber-600" : "text-gray-500"}`} />
                {hasNotifications && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <Button variant="outline" size="sm" className="font-medium" asChild>
                <Link href="/logout">Log out</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-white">
        <div className="container mx-auto max-w-[1400px] px-4">
          <VetPortalTabs />
        </div>
      </div>

      <main className="container mx-auto max-w-[1400px] px-4 py-8">{children}</main>
    </div>
  )
}
