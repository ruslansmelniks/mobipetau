import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import ConfirmationClient from '../ConfirmationClient';

export default async function BookingConfirmation({ searchParams }: { searchParams: any }) {
  // Use Supabase server helper for SSR auth
  const supabase = createServerComponentClient({ cookies });
  const params = typeof searchParams.then === 'function' ? await searchParams : searchParams;
  const sessionId = params.session_id || undefined;

  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('Supabase getUser result:', user, error);

  if (!user) {
    redirect('/login');
  }

  return <ConfirmationClient user={user} sessionId={sessionId} />;
}