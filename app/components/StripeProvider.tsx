'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [isStripeLoaded, setIsStripeLoaded] = useState(false)

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (stripe) {
        setIsStripeLoaded(true)
      }
    })
  }, [])

  if (!isStripeLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return <Elements stripe={stripePromise}>{children}</Elements>
} 