'use client'

import { useEffect } from 'react'

export function GoogleMapsCleanup() {
  useEffect(() => {
    // Clean up any duplicate Google Maps instances
    if (typeof window !== 'undefined' && window.google?.maps) {
      // Remove any duplicate custom elements
      const customElements = [
        'gmp-place-attribution',
        'gmp-place-website',
        'gmp-place-phone-number',
        'gmp-place-opening-hours',
        'gmp-place-summary',
        'gmp-place-type-specific-highlights',
        'gmp-place-reviews',
        'gmp-place-plus-code',
        'gmp-place-feature-list'
      ]
      
      customElements.forEach(elementName => {
        try {
          if (window.customElements.get(elementName)) {
            console.log(`Skipping duplicate definition of ${elementName}`)
          }
        } catch (e) {
          // Element not defined, safe to proceed
        }
      })
    }
  }, [])

  return null
} 