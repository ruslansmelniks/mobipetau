import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  // Update the session and handle redirects
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 