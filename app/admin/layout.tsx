"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { Button } from "@/components/ui/button"
import { 
  Users, UserCog, LogOut, Home, Menu, X
} from "lucide-react"
import { getUserRole } from "@/lib/auth"
import { toast } from "@/components/ui/use-toast"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()
  const supabase = useSupabaseClient()
  const user = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        console.log("No user found, redirecting to login");
        router.push('/login');
        return;
      }

      try {
        // Only check admin from user metadata (JWT/app_metadata)
        const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
        if (!isAdmin) {
          console.log("Not an admin user");
          router.push('/');
          return;
        }
        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast({
          title: "Error",
          description: "Failed to verify admin status.",
          variant: "destructive",
        });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Return null to prevent flash of content before redirect happens
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - desktop */}
      <div
        className={`bg-white border-r shadow-sm fixed inset-y-0 left-0 z-20 w-64 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/admin" className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="MobiPet Admin" 
                width={96} 
                height={32} 
                className="h-8 w-auto" 
                style={{ height: 'auto' }}
                priority
              />
              <span className="ml-2 font-semibold text-gray-800">Admin</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-900 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-md"
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-md"
                >
                  <Users className="h-5 w-5 mr-3" />
                  User Management
                </Link>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-900 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="ml-4 text-lg font-semibold text-gray-800">MobiPet Admin</h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-4">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>

      {/* Mobile menu overlay */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed inset-0 z-10 bg-black bg-opacity-50 lg:hidden"
        ></button>
      )}
    </div>
  )
} 