'use server'

import { createClient } from '@/lib/supabase/server'

export async function fetchUserPets() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    console.error('Server: No authenticated session found')
    return { error: 'No authenticated session' }
  }

  console.log('Server: Fetching pets for user:', session.user.id)

  const { data: pets, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', session.user.id)

  if (error) {
    console.error('Server: Error fetching pets:', error)
    return { error: error.message }
  }

  console.log('Server: Pets fetched successfully:', pets?.length || 0)
  return { pets: pets || [] }
}

export async function validateUserSession() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'No authenticated session' }
  }

  return { user: session.user }
} 