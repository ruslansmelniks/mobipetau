"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { useUser, useSupabaseClient } from "@/hooks/useSupabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, DollarSign, User, PawPrint } from "lucide-react"

export function PortalTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [userRole, setUserRole] = useState('pet_owner');
  
  useEffect(() => {
    const getUserRole = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role || 'pet_owner')
      }
    }
    getUserRole()
  }, [user, supabase])
  
  const tabs = [
    { name: "Profile", href: "/portal/profile" },
    { name: userRole === 'vet' ? "My jobs" : "My bookings", href: "/portal/bookings" },
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
              isActive(tab.href) ? "text-primary" : "text-gray-600 hover:text-primary",
            )}
          >
            {tab.name}
            {isActive(tab.href) && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </Link>
        ))}
      </div>
      {userRole !== 'vet' && (
        <Button
          className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
          asChild
        >
          <Link href="/book">Book appointment</Link>
        </Button>
      )}
    </div>
  )
}
