"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase/client'
import { cn } from "@/lib/utils"

type UserRole = 'vet' | 'pet_owner'

export function PortalTabs() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole>('pet_owner')

  useEffect(() => {
    async function checkUserRole() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.error('Auth error:', authError)
          return
        }

        // First try to get the role from the profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile error:', profileError)
          // If profile doesn't exist, try to get role from auth.users
          const { data: authUser, error: authUserError } = await supabase
            .from('auth.users')
            .select('raw_user_meta_data->role')
            .eq('id', user.id)
            .maybeSingle()

          if (authUserError) {
            console.error('Auth user error:', authUserError)
            return
          }

          const role = authUser?.role as UserRole
          setUserRole(role || 'pet_owner')
          return
        }

        const role = profile?.role as UserRole
        setUserRole(role || 'pet_owner')
      } catch (err) {
        console.error('Error checking user role:', err)
      }
    }

    checkUserRole()
  }, [])

  const petOwnerTabs = [
    { name: "Profile", href: "/portal/profile" },
    { name: "My Pets", href: "/portal/pets" },
    { name: "Appointments", href: "/portal/appointments" },
    { name: "Messages", href: "/portal/messages" },
  ]

  const vetTabs = [
    { name: "Profile", href: "/dashboard/profile" },
    { name: "Appointments", href: "/dashboard/appointments" },
    { name: "Messages", href: "/dashboard/messages" },
  ]

  const tabs = userRole === 'vet' ? vetTabs : petOwnerTabs

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
              isActive(tab.href) ? "text-[#4e968f] border-b-2 border-[#4e968f]" : "text-gray-600 hover:text-[#4e968f] border-b-2 border-transparent",
            )}
          >
            {tab.name}
          </Link>
        ))}
      </div>
      {userRole === 'pet_owner' && (
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
