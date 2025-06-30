"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SmartLogo } from "@/components/smart-logo";

export default function SignupSuccessPage() {
  const router = useRouter();
  const [supabase] = useState(() => createPagesBrowserClient());
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error checking session:", sessionError);
        setError("Could not verify session. Please try logging in.");
        setHasSession(false);
      } else if (session) {
        setHasSession(true);
      } else {
        // No active session. This might be okay if email confirmation is pending.
        // For now, we will show a generic success but user might need to login or confirm email.
        // Consider adding a message about checking email if that flow is active.
        setHasSession(false); // Or true if we assume email confirmation is the next step
      }
      setIsLoading(false);
    };
    checkSession();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        <p className="mt-4 text-gray-600">Verifying...</p>
      </div>
    );
  }
  
  // If an error occurred fetching session
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verification Issue</h1>
        <p className="text-red-600 mb-6">{error}</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }

  // If there is no session and no error, it could mean email confirmation is pending
  // or the user navigated here directly. For now, we'll show a slightly different message.
  // Your middleware should ideally redirect an authenticated user from here anyway.
  const message = hasSession 
    ? "Your MobiPet account has been successfully created. You can now proceed to your dashboard or log in if prompted."
    : "Your MobiPet account has been created. If email confirmation is required, please check your inbox. You can then log in.";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <SmartLogo />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Account Created!</h1>
          
          <p className="text-gray-600 mb-8">
            {message}
          </p>
          
          <div className="space-y-4">
            <Button 
              className="w-full bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
              asChild
            >
              <Link href="/portal/bookings">Go to Dashboard</Link>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Image src="/logo.png" alt="MobiPet Logo" width={96} height={32} className="h-[32px] w-auto" style={{ height: 'auto' }} />
            </div>
            <div className="text-sm text-gray-500">© 2025 MobiPet. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
} 