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
    { name: "Jobs", href: "/vet/jobs" },
    { name: "Messages", href: "/vet/messages" },
  ]

  // Debug logging
  console.log('VetPortalTabs loaded with tabs:', tabs)
  console.log('Current pathname:', pathname)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <>
      {/* Temporary debug indicator */}
      <div style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        background: "blue", 
        color: "white", 
        padding: "2px 4px", 
        fontSize: "10px", 
        zIndex: 9999,
        borderRadius: "2px"
      }}>
        UPDATED VET TABS
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "px-4 py-4 text-sm font-medium transition-colors relative",
                isActive(tab.href) ? "text-primary" : "text-gray-600 hover:text-primary",
              )}
            >
              {tab.name}
              {isActive(tab.href) && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
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
    </>
  )
}
