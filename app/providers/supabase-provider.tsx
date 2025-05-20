"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient, SupabaseClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { redirectBasedOnRole } from "@/lib/utils"

const SupabaseContext = createContext<SupabaseClient | null>(null)

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClientComponentClient())
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Get role from metadata or make a DB query
        const role = session.user.user_metadata?.role;
        redirectBasedOnRole(role, router);
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
} 