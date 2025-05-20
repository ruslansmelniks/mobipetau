"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { SmartLogo } from "@/components/smart-logo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);
      
      // Supabase signin
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Supabase SignIn Error:", signInError);
        setError(signInError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      console.log("Sign in successful, user data:", data);
      
      // Check user role from metadata
      const userRole = data.user?.user_metadata?.role || data.user?.app_metadata?.role;
      console.log("User role from metadata:", userRole);
      if (userRole === 'admin') {
        console.log("Redirecting to admin panel");
        router.push('/admin');
        return;
      } else if (userRole === 'vet') {
        console.log("Redirecting to vet portal");
        router.push('/vet');
        return;
      } else {
        router.push('/portal/bookings');
        return;
      }
    } catch (err: any) {
      console.error('Login error (catch block):', err);
      setError(err.message || "An unexpected error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto flex h-16 items-center justify-between px-4 max-w-[1400px]">
        <div className="flex items-center">
          <SmartLogo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="text-teal-600 hover:text-teal-500">
                Sign up
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#4e968f] hover:bg-[#43847e]"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-teal-600 hover:text-teal-500"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
