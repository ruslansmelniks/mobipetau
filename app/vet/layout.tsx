"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VetPortalTabs } from "@/components/vet-portal-tabs"
import { NotificationBellWrapper } from "@/components/notification-bell-wrapper"
import { SmartLogo } from "@/components/smart-logo"

export default function VetPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex justify-between items-center">
            <SmartLogo />
            <div className="flex items-center gap-4">
              <NotificationBellWrapper />
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
