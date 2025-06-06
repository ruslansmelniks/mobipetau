"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PortalTabs } from "@/components/portal-tabs"
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { User } from "@supabase/supabase-js"
import { UserData, UserProfile } from "@/types"
import { NotificationBell } from "@/components/notification-bell"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [supabase] = useState(() => createPagesBrowserClient())

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const currentUser = session.user as User;
        // Check role from both metadata sources and database
        const metadataRole = currentUser.user_metadata?.role || currentUser.app_metadata?.role;
        let finalRole = metadataRole;
        if (!finalRole) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single();
          finalRole = dbUser?.role || 'pet_owner';
        }
        console.log('Portal layout role check:', {
          userId: currentUser.id,
          metadataRole,
          finalRole
        });
        // Only redirect if user is NOT a pet owner
        if (finalRole === 'admin') {
          console.log('Admin user in portal, redirecting to admin');
          router.push('/admin');
          return;
        } else if (finalRole === 'vet') {
          console.log('Vet user in portal, redirecting to vet');
          router.push('/vet');
          return;
        }
        // Pet owners should stay in portal
        const userData: UserData = {
          ...currentUser,
          user_metadata: currentUser.user_metadata as UserProfile || {},
        };
        setUser(userData);
        if (userData.user_metadata?.first_name) {
          setUser(prev => prev ? { ...prev, user_metadata: {...prev.user_metadata, firstName: userData.user_metadata.first_name } } : null);
        } else if (currentUser.email) {
          setUser(prev => prev ? { ...prev, user_metadata: {...prev.user_metadata, firstName: currentUser.email!.split('@')[0] || 'User' } } : null );
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    getSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.push('/login');
      } else if (session && session.user) {
        const currentUser = session.user as User;
        // Check role from both metadata sources and database
        const metadataRole = currentUser.user_metadata?.role || currentUser.app_metadata?.role;
        let finalRole = metadataRole;
        if (!finalRole) {
          supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single()
            .then(({ data: dbUser }) => {
              finalRole = dbUser?.role || 'pet_owner';
              if (finalRole === 'admin') {
                console.log('Admin user in portal (auth change), redirecting to admin');
                router.push('/admin');
              } else if (finalRole === 'vet') {
                console.log('Vet user in portal (auth change), redirecting to vet');
                router.push('/vet');
              }
            });
        } else {
          if (finalRole === 'admin') {
            console.log('Admin user in portal (auth change), redirecting to admin');
            router.push('/admin');
          } else if (finalRole === 'vet') {
            console.log('Vet user in portal (auth change), redirecting to vet');
            router.push('/vet');
          }
        }
        const userData: UserData = {
          ...currentUser,
          user_metadata: currentUser.user_metadata as UserProfile || {},
        };
        setUser(userData);
        if (userData.user_metadata?.first_name) {
          setUser(prev => prev ? { ...prev, user_metadata: {...prev.user_metadata, firstName: userData.user_metadata.first_name } } : null);
        } else if (currentUser.email) {
          setUser(prev => prev ? { ...prev, user_metadata: {...prev.user_metadata, firstName: currentUser.email!.split('@')[0] || 'User' } } : null );
        }
      }
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener should handle the redirect to /login
    // router.push('/login'); // Usually not needed if listener is effective
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    // This case should ideally be handled by the redirect in useEffect, 
    // but as a fallback or if loading finishes before redirect completes.
    return (
      <div className="min-h-screen flex items-center justify-center">
         <p className="text-gray-600">Redirecting to login...</p>
      </div>
    ); 
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto max-w-[1400px] py-4 px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-sm mr-2">
                <span className="text-gray-500">Welcome,</span>{" "}
                <span className="font-medium">{user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <NotificationBell />
              <Button variant="outline" size="sm" className="font-medium" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-white">
        <div className="container mx-auto max-w-[1400px] px-4">
          <PortalTabs />
        </div>
      </div>

      <main className="container mx-auto max-w-[1400px] px-4 py-8">{children}</main>
    </div>
  );
}
