"use client";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change:", event, Boolean(session), pathname);
        
        if (event === 'SIGNED_IN') {
          // Check if we're on the login or signup page, redirect to appropriate dashboard
          if (pathname === '/login' || pathname === '/signup') {
            const role = session?.user?.user_metadata?.role;
            if (role === 'vet') {
              router.push('/vet');
            } else {
              router.push('/portal/bookings');
            }
          }
        } else if (
          event === 'SIGNED_OUT' ||
          (event === 'USER_UPDATED' && !session)
        ) {
          // If on a protected route, redirect to login
          if (
            pathname?.startsWith('/portal') ||
            pathname?.startsWith('/vet') ||
            pathname?.startsWith('/book')
          ) {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabaseClient]);

  return (
    <SessionContextProvider 
      supabaseClient={supabaseClient}
      initialSession={null}
    >
      {children}
    </SessionContextProvider>
  );
} 