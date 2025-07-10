"use client";

import Image from 'next/image';

export function SmartLogo({ className }: { className?: string }) {
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