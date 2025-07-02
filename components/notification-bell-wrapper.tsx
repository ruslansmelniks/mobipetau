"use client"

import { useUser } from "@/hooks/useSupabase"
import { NotificationBell } from "./notification-bell"
import { ErrorBoundary } from "./error-boundary"

export function NotificationBellWrapper() {
  const { user } = useUser()
  
  // Only render NotificationBell if user is logged in
  if (!user) {
    return null
  }
  
  return (
    <ErrorBoundary>
      <NotificationBell />
    </ErrorBoundary>
  )
} 