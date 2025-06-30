"use client"

import { useEffect, useState, memo } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PortalTabs } from "@/components/portal-tabs"
import { NotificationBell } from "@/components/notification-bell"
import { createClient } from '@/lib/supabase/client'
import { SmartLogo } from '@/components/smart-logo'

function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (!mounted) return;

        if (authError) {
          console.error('Auth error:', authError)
          setError(authError.message)
          router.push('/login')
          return
        }

        if (!user) {
          router.push('/login')
          return
        }

        // Get user profile with role
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!mounted) return;

        setUser(user)
        setUserRole(profile?.role || 'pet_owner')
      } catch (err) {
        if (!mounted) return;
        console.error('Error checking auth:', err)
        setError('Failed to check authentication')
        router.push('/login')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false;
    }
  }, []) // Remove router from dependencies to prevent re-runs

  const handleLogout = () => {
    router.push('/logout')
  }

  if (isLoading) {
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
              <NotificationBell />
              <span className="text-sm text-gray-700">Welcome, {displayName}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <PortalTabs />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default memo(PortalLayout)
