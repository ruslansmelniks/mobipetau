import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user role
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role || 'pet_owner'

    // Fetch appointments based on role
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        pets (
          id,
          name,
          type,
          breed,
          image
        ),
        vet:vet_id (
          id,
          first_name,
          last_name
        )
      `)
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (userRole === 'vet') {
      query = query.eq('vet_id', user.id)
    } else {
      query = query.eq('pet_owner_id', user.id)
    }
    
    const { data: appointments, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching appointments:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    return NextResponse.json({ appointments: appointments || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 