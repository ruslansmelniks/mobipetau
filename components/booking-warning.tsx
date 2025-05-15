"use client"

import { useEffect } from "react"
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react"
import { useRouter } from 'next/navigation'

export function BookingWarning() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // Warn on browser/tab close or reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "You are about to leave the booking process. If you exit now, your booking progress will be lost. Are you sure you want to leave?";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Warn on in-app navigation (Next.js workaround)
    const handleClick = (e: MouseEvent) => {
      // Only warn if not clicking inside the booking flow
      let target = e.target as HTMLElement | null;
      while (target) {
        if (target.tagName === 'A') {
          const href = (target as HTMLAnchorElement).getAttribute('href');
          if (href && !href.startsWith('/book')) {
            const confirmed = window.confirm("You are about to leave the booking process. If you exit now, your booking progress will be lost. Are you sure you want to leave?");
            if (!confirmed) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }
        }
        target = target.parentElement;
      }
    };
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
} 