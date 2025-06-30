"use client";
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      console.log('[SupabaseProvider] Initial session:', session?.user?.email);
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      console.log('[SupabaseProvider] Auth state change:', _event, session?.user?.email);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  // Add session validation
  useEffect(() => {
    const validateSession = async () => {
      try {
        console.log('[SupabaseProvider] Validating session...');
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.error('[SupabaseProvider] Session validation error:', error);
        }

        if (!session) {
          // Only attempt refresh if a Supabase auth cookie exists
          const hasAuthCookie = typeof document !== 'undefined' && document.cookie.includes('sb-');
          if (hasAuthCookie) {
            console.log('[SupabaseProvider] No session found, attempting refresh...');
            const { data, error: refreshError } = await supabaseClient.auth.refreshSession();
            if (refreshError) {
              console.error('[SupabaseProvider] Session refresh failed:', refreshError);
            } else if (data.session) {
              console.log('[SupabaseProvider] Session refreshed successfully');
              setSession(data.session);
            }
          } else {
            // No session and no cookie, just set loading to false
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('[SupabaseProvider] Session validation failed:', error);
        setLoading(false);
      }
    };

    validateSession();
  }, [supabaseClient]);

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={session}>
      {children}
    </SessionContextProvider>
  );
} 