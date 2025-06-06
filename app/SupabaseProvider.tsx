"use client";

import { createBrowserClient } from '@supabase/ssr';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabaseClient] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, refreshing router');
        router.refresh();
      }
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, refreshing router');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, router]);

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
} 