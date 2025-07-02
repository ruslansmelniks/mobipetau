import './globals.css'
import SupabaseProvider from './providers/supabase-provider'

export const metadata = {
  title: 'MobiPet',
  description: 'Online vet directory for pet owners',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
