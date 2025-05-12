"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileMenuProps {
  links: {
    href: string
    label: string
  }[]
  onOpenWaitlistDialog: () => void
}

export function MobileMenu({ links, onOpenWaitlistDialog }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
    // Prevent scrolling when menu is open
    if (!isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
  }

  const closeMenu = () => {
    setIsOpen(false)
    document.body.style.overflow = "auto"
  }

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" className="text-gray-700" onClick={toggleMenu} aria-label="Toggle menu">
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={closeMenu}
      />

      {/* Menu panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[80%] max-w-sm bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-semibold text-lg">Menu</span>
          <Button variant="ghost" size="icon" onClick={closeMenu} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4">
          <ul className="space-y-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-2 text-gray-700 hover:text-teal-600 font-medium"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-4 border-t">
              <button
                className="block py-2 text-gray-700 hover:text-teal-600 font-medium text-left w-full"
                onClick={() => {
                  closeMenu()
                  onOpenWaitlistDialog()
                }}
              >
                Become a provider
              </button>
            </li>
            <li className="pt-4">
              <div className="flex flex-col space-y-3">
                <Button
                  variant="outline"
                  className="w-full bg-[#fcfcfd] border-[#d0d5dd] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)] hover:bg-gray-50"
                  asChild
                >
                  <Link href="/login" onClick={closeMenu}>
                    Log in
                  </Link>
                </Button>
                <Button
                  className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
                  asChild
                >
                  <Link href="/signup" onClick={closeMenu}>
                    Sign up
                  </Link>
                </Button>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
