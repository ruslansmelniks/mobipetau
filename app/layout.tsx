import './globals.css'

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
        {children}
      </body>
    </html>
  )
}
