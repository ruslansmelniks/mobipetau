import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  // Get the authorization header from the client
  const authHeader = request.headers.get('authorization')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            console.error('Error setting cookies:', error)
          }
        },
      },
    }
  )
  // If we have an auth header, set the session
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) {
      return NextResponse.json({ success: true, user })
    }
  }
  // Otherwise, check for existing session
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return NextResponse.json({ error: 'No session found' }, { status: 401 })
  }
  return NextResponse.json({ success: true, user: session.user })
}
