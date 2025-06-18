"use client"

import Image from 'next/image'
import { useState } from 'react'

interface LogoProps {
  className?: string
}

export function Logo({ className = "" }: LogoProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-xl font-bold text-[#4e968f]">MobiPet</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="MobiPet Logo"
        width={40}
        height={40}
        style={{ width: 'auto', height: '40px' }}
        className="object-contain"
        onError={() => setError(true)}
        priority
      />
    </div>
  )
} 