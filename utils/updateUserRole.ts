import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function updateUserRole(userId: string, role: 'vet' | 'pet_owner') {
  try {
    const supabase = createClientComponentClient()

    // First, update the user's metadata in auth.users
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: { role: role }
    })

    if (authError) throw authError

    // Also update in your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({ role: role })
      .eq('id', userId)

    if (userError) throw userError

    return { success: true, data: authData }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { success: false, error }
  }
}

// Run this once for your test user
export async function fixTestUserRole() {
  const supabase = createClientComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user && user.email === 'r.melniks@spinwise.com') {
    const result = await updateUserRole(user.id, 'vet')
    console.log('Role update result:', result)
  }
} 