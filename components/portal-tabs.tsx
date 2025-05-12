"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"

export function PortalTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabaseClient();
  
  const tabs = [
    { name: "Profile", href: "/portal/profile" },
    { name: "My bookings", href: "/portal/bookings" },
    { name: "Messages", href: "/portal/messages" },
    { name: "My pets", href: "/portal/pets" },
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
        <Link href="/book">Book appointment</Link>
      </Button>
    </div>
  )
}
