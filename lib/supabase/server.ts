import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
        },
        async setAll(cookiesToSet) {
          for (const { name, value, ...options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options })
          }
        }
      }
    }
  )
} 