import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4 flex items-center justify-between">
          <Link href="/admin" className="text-2xl font-bold text-teal-600">MobiPet Admin</Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/logout">Log out</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-[1400px] px-4 py-8">{children}</main>
    </div>
  )
} 