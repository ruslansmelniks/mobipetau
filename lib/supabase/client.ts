import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Parse cookies from document.cookie
          const cookies = document.cookie.split(';')
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))
          if (!cookie) return undefined
          const value = cookie.split('=')[1]
          return decodeURIComponent(value)
        },
        set(name: string, value: string, options?: any) {
          // Build cookie string
          let cookieStr = `${name}=${encodeURIComponent(value)}`
          
          // Add options
          if (options?.maxAge) {
            cookieStr += `; Max-Age=${options.maxAge}`
          }
          if (options?.expires) {
            cookieStr += `; Expires=${options.expires.toUTCString()}`
          }
          if (options?.path) {
            cookieStr += `; Path=${options.path}`
          } else {
            cookieStr += `; Path=/`
          }
          if (options?.domain) {
            cookieStr += `; Domain=${options.domain}`
          }
          if (options?.secure) {
            cookieStr += `; Secure`
          }
          if (options?.sameSite) {
            cookieStr += `; SameSite=${options.sameSite}`
          } else {
            cookieStr += `; SameSite=lax`
          }
          
          // Set the cookie
          document.cookie = cookieStr
        },
        remove(name: string, options?: any) {
          // Remove cookie by setting it with expired date
          let cookieStr = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
          if (options?.path) {
            cookieStr += `; Path=${options.path}`
          } else {
            cookieStr += `; Path=/`
          }
          if (options?.domain) {
            cookieStr += `; Domain=${options.domain}`
          }
          document.cookie = cookieStr
        }
      }
    }
  )
} 