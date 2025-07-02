"use client"

import { useEffect, useState, memo } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PortalTabs } from "@/components/portal-tabs"
import { NotificationBellWrapper } from "@/components/notification-bell-wrapper"
import { AppointmentNotifications } from "@/components/appointment-notifications"
import { ErrorBoundary } from "@/components/error-boundary"
import { redirectBasedOnRole } from "@/lib/utils"
import { useUser, useSupabaseClient } from "@/hooks/useSupabase"
import { SmartLogo } from '@/components/smart-logo'

function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabaseClient()
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        console.log('[PortalLayout] Starting auth check...')
        
        if (!user) {
          console.log('[PortalLayout] No user found, redirecting to login')
          router.push('/login')
          return
        }

        console.log('[PortalLayout] User found:', user.email)

        // Get user profile with role
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!mounted) return;

        setUserRole(profile?.role || 'pet_owner')
      } catch (err) {
        if (!mounted) return;
        console.error('[PortalLayout] Error checking auth:', err)
        setError('Failed to check authentication')
        router.push('/login')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    if (!userLoading) {
      checkAuth()
    }

    return () => {
      mounted = false;
    }
  }, [user, userLoading, router, supabase])

  const handleLogout = () => {
    router.push('/logout')
  }

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Let the redirect happen
  }

  // Get display name
  const displayName = user.user_metadata?.first_name || user.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <SmartLogo className="h-8 w-auto mr-8" />
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBellWrapper />
              <span className="text-sm text-gray-700">Welcome, {displayName}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PortalTabs />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default memo(PortalLayout)
