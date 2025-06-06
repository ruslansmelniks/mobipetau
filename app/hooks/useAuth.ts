import { useEffect, useState } from 'react'
import { useSupabaseClient, useUser, useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

type Role = 'admin' | 'vet' | 'pet_owner'

export function useAuth(requiredRole?: Role) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = useSupabaseClient()
  const user = useUser()
  const session = useSession()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Session is still loading
        if (session === undefined) {
          setAuthState('loading')
          return
        }

        // No session
        if (!session || !user) {
          setAuthState('unauthenticated')
          setUserRole(null)
          return
        }

        // Get user role
        const role = user.user_metadata?.role || 'pet_owner'
        setUserRole(role)
        setAuthState('authenticated')

        // Check if user has required role
        if (requiredRole && role !== requiredRole) {
          setError(`Access denied. Required role: ${requiredRole}`)
          // Redirect to appropriate dashboard
          const redirectMap = {
            admin: '/admin',
            vet: '/vet',
            pet_owner: '/portal/bookings'
          }
          router.replace(redirectMap[role as keyof typeof redirectMap] || '/')
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setError('Authentication error')
        setAuthState('unauthenticated')
      }
    }

    checkAuth()
  }, [session, user, requiredRole, router, supabase])

  return {
    authState,
    userRole,
    user,
    session,
    error,
    isLoading: authState === 'loading',
    isAuthenticated: authState === 'authenticated',
  }
} 