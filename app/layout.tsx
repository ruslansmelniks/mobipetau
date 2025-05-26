import type { Metadata } from 'next'
import './globals.css'
import SupabaseProvider from './SupabaseProvider'
import { SmartLogo } from "@/components/smart-logo"
import { NotificationBell } from "@/components/notification-bell"
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <Providers>
            {children}
          </Providers>
        </SupabaseProvider>
      </body>
    </html>
  )
}
