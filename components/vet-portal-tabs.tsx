"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function VetPortalTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Profile", href: "/vet/profile" },
    { name: "Appointments", href: "/vet/appointments" },
    { name: "Messages", href: "/vet/messages" },
  ]

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <div className="flex justify-between items-center">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "px-4 py-4 text-sm font-medium transition-colors relative",
              isActive(tab.href) ? "text-teal-600" : "text-gray-600 hover:text-teal-600",
            )}
          >
            {tab.name}
            {isActive(tab.href) && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
          </Link>
        ))}
      </div>
      <Button
        className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
        asChild
      >
        <Link href="/vet/availability">Set availability</Link>
      </Button>
    </div>
  )
}
