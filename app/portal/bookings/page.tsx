import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import BookingsContent from './BookingsContent'

export default async function BookingsPage() {
  try {
    // Properly await cookies
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      redirect('/login')
    }

    if (!user) {
      console.log('No user found, redirecting to login')
      redirect('/login')
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      redirect('/login')
    }

    const userRole = profile?.role || 'pet_owner'

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Appointments</h1>
        <BookingsContent userId={user.id} userRole={userRole} />
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in BookingsPage:', error)
    redirect('/login')
  }
}