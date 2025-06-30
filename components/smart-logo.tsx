"use client";

import { useUser } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import Link from 'next/link';

export function SmartLogo({ className }: { className?: string }) {
  const user = useUser();

  // Determine the correct home URL based on authentication status
  const getHomeUrl = () => {
    if (!user) return '/';
    return '/portal/bookings';
  };

  return (
    <Link href={getHomeUrl()} className={`flex items-center ${className || ''}`}>
      <Image 
        src="/logo.png" 
        alt="MobiPet Logo" 
        width={96} 
        height={32} 
        className="h-[32px] w-auto" 
        style={{ height: 'auto' }}
      />
    </Link>
  );
} 