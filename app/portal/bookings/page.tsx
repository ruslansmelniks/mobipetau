import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingsContent from './BookingsContent'

export default async function BookingsPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'pet_owner'

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Appointments</h1>
      <BookingsContent userId={user.id} userRole={userRole} />
    </div>
  )
}