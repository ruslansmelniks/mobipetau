"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PortalTabs } from "@/components/portal-tabs"
import { NotificationBell } from "@/components/notification-bell"
import { useSupabaseClient, useUser, useSession } from "@supabase/auth-helpers-react"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const user = useUser()
  const session = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Mark as initialized after first render
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    const checkUserRole = async () => {
      // Don't check until initialized and we have session data
      if (!isInitialized) return
      
      // If session is explicitly null (not undefined), user is not logged in
      if (session === null) {
        console.log('No session found, redirecting to login')
        router.push('/login')
        return
      }
      
      // If we have a session and user
      if (session && user) {
        try {
          // Check role from metadata first
          const metadataRole = user.user_metadata?.role || user.app_metadata?.role
          
          // If no role in metadata, check database
          let finalRole = metadataRole
          if (!finalRole) {
            const { data: dbUser } = await supabase
              .from('users')
              .select('role')
              .eq('id', user.id)
              .single()
            
            finalRole = dbUser?.role || 'pet_owner'
          }
          
          console.log('Portal layout role check:', {
            userId: user.id,
            metadataRole,
            finalRole
          })
          
          // Redirect based on role
          if (finalRole === 'admin') {
            console.log('Admin user in portal, redirecting to admin')
            router.push('/admin')
            return
          } else if (finalRole === 'vet') {
            console.log('Vet user in portal, redirecting to vet')
            router.push('/vet')
            return
          }
          
          // Pet owners can stay - mark loading as complete
          setIsLoading(false)
        } catch (error) {
          console.error('Error checking user role:', error)
          setIsLoading(false)
        }
      }
    }
    
    checkUserRole()
  }, [session, user, router, supabase, isInitialized])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Show loading while checking authentication
  if (isLoading || !isInitialized || session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // User not logged in
  if (!session || !user) {
    return null // Let the redirect happen
  }

  // Get display name
  const displayName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-sm mr-2">
                <span className="text-gray-500">Welcome,</span>{" "}
                <span className="font-medium">{displayName}</span>
              </div>
              <NotificationBell />
              <Button variant="outline" size="sm" className="font-medium" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-white">
        <div className="container mx-auto max-w-[1400px] px-4">
          <PortalTabs />
        </div>
      </div>

      <main className="container mx-auto max-w-[1400px] px-4 py-8">{children}</main>
    </div>
  )
}
