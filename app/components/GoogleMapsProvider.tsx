"use client"

import { LoadScript } from '@react-google-maps/api'
import { useState, useEffect } from 'react'

const libraries: ("places")[] = ["places"]

// Track if Google Maps is already loaded
let isGoogleMapsLoaded = false

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      isGoogleMapsLoaded = true
      setIsLoaded(true)
    }
  }, [])

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        <p className="text-red-600">Failed to load Google Maps. Please try refreshing the page.</p>
      </div>
    )
  }

  if (isLoaded) {
    return <>{children}</>
  }

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries}
      onLoad={() => {
        isGoogleMapsLoaded = true
        setIsLoaded(true)
      }}
      onError={(error) => {
        console.error('Google Maps loading error:', error)
        setError(error)
      }}
    >
      {children}
    </LoadScript>
  )
} 