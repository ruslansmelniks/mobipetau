import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import ConfirmationClient from '../ConfirmationClient';

export default async function BookingConfirmation({ searchParams }: { searchParams: any }) {
  // Create a new Supabase client for the server component
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  // Handle search params properly
  const params = typeof searchParams.then === 'function' ? await searchParams : searchParams;
  const sessionId = params.session_id || undefined;

  // Get the current user
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('Supabase getUser result:', user, error);

  // If no user, redirect to login
  if (!user) {
    redirect('/login');
  }

  return <ConfirmationClient user={user} />;
}