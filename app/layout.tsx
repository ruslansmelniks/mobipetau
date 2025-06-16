import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { GoogleMapsCleanup } from '@/components/GoogleMapsCleanup'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MobiPet - Connect with Trusted Vets',
  description: 'Find and book appointments with veterinarians in your area',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleMapsCleanup />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
