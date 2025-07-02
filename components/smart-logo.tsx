"use client";

import Image from 'next/image';
import { useUser } from '@/hooks/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function SmartLogo({ className, noLink }: { className?: string, noLink?: boolean }) {
  const { user } = useUser();
  const router = useRouter();

  // Determine the correct home URL based on authentication status
  const getHomeUrl = () => {
    if (!user) return '/';
    return '/portal/bookings';
  };

  if (noLink) {
    return (
      <span className={`flex items-center ${className || ''}`}>
        <Image 
          src="/logo.png" 
          alt="MobiPet Logo" 
          width={96} 
          height={32} 
          className="h-[32px] w-auto" 
          priority
        />
      </span>
    );
  }

  return (
    <Link href={getHomeUrl()} className={`flex items-center ${className || ''}`}>
      <Image 
        src="/logo.png" 
        alt="MobiPet Logo" 
        width={96} 
        height={32} 
        className="h-[32px] w-auto" 
        priority
      />
    </Link>
  );
} 