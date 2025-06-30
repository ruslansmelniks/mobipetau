"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PortalTabs } from "@/components/portal-tabs"
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { User } from "@supabase/supabase-js"
import { UserData, UserProfile } from "@/types"
import { NotificationBell } from "@/components/notification-bell"
import { SmartLogo } from "@/components/smart-logo"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('[PortalLayout] useEffect triggered', { session, loading });
    
    // Don't redirect while still loading
    if (loading && session === undefined) {
      console.log('[PortalLayout] Still loading, waiting for session...');
      return;
    }
    
    // Only redirect if we're sure there's no session
    if (!loading && !session && !user) {
      console.log('[PortalLayout] No session after loading, redirecting to login');
      router.push('/login');
      return;
    }
    
    if (session && session.user) {
      console.log('[PortalLayout] Session and user found', session.user);
      const currentUser = session.user as User;
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
      setLoading(false);
    } else if (session === null) {
      console.log('[PortalLayout] Session is null, redirecting to login');
      setUser(null);
      setLoading(false);
      router.push('/login');
    }
  }, [session, loading, user, router]);

  // Initialize session loading
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('[PortalLayout] Initializing session...');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[PortalLayout] Error getting initial session:', error);
          setLoading(false);
          router.push('/login');
          return;
        }
        
        if (initialSession) {
          console.log('[PortalLayout] Initial session found:', initialSession.user.email);
          setLoading(false);
        } else {
          console.log('[PortalLayout] No initial session found');
          setLoading(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('[PortalLayout] Error in session initialization:', error);
        setLoading(false);
        router.push('/login');
      }
    };

    initializeSession();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener in the global provider should handle the redirect to /login
  };

  if (loading || session === undefined) {
    console.log('[PortalLayout] Waiting for session or loading:', { session, loading });
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
    console.log('[PortalLayout] No user after loading, should be redirecting.');
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
            <SmartLogo />
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
