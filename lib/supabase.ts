import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
  cookies: {
    get(name: string) {
      if (typeof document !== 'undefined') {
        const cookie = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined
      }
      return undefined
    },
    set(name: string, value: string, options: any) {
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${
          options.maxAge ? `max-age=${options.maxAge};` : ''
        } ${options.httpOnly ? 'httpOnly;' : ''} ${
          options.secure ? 'secure;' : ''
        } ${options.sameSite ? `sameSite=${options.sameSite}` : ''}`
      }
    },
    remove(name: string) {
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    },
  },
}) 