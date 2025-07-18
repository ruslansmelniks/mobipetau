"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/hooks/useSupabase';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();

  useEffect(() => {
    async function signOut() {
      await supabase.auth.signOut();
      router.push('/');
    }
    signOut();
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you out...</p>
    </div>
  );
} 