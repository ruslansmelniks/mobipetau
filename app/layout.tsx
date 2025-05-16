import type { Metadata } from 'next'
import './globals.css'
import SupabaseProvider from './SupabaseProvider'
import { SmartLogo } from "@/components/smart-logo"
import { NotificationBell } from "@/components/notification-bell"

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
          <header className="bg-white border-b">
            <div className="container mx-auto max-w-[1400px] py-4 px-4 flex items-center justify-between">
              <SmartLogo />
              <NotificationBell />
            </div>
          </header>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
