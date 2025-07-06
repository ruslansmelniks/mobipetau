import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { appointmentId, proposedDate, proposedTimeRange, proposedExactTime, message } = await req.json();
    if (!appointmentId || !proposedDate || !proposedTimeRange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data: existingProposal } = await supabase
      .from('time_proposals')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('vet_id', user.id)
      .single();
    if (existingProposal) {
      const { error: updateError } = await supabase
        .from('time_proposals')
        .update({
          proposed_date: proposedDate,
          proposed_time_range: proposedTimeRange,
          proposed_exact_time: proposedExactTime || null,
          message: message || null,
          status: 'pending'
        })
        .eq('id', existingProposal.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('time_proposals')
        .insert({
          appointment_id: appointmentId,
          vet_id: user.id,
          proposed_date: proposedDate,
          proposed_time_range: proposedTimeRange,
          proposed_exact_time: proposedExactTime || null,
          message: message || null
        });
      if (insertError) throw insertError;
    }
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`id, pet_owner_id, date, time, pets(name), users!appointments_pet_owner_id_fkey(first_name, last_name)`)
      .eq('id', appointmentId)
      .single();
    const { data: vetProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    const notificationData = {
      user_id: appointment.pet_owner_id,
      type: 'time_proposed',
      title: 'New Time Proposed',
      message: `Dr. ${vetProfile?.first_name || 'Unknown'} has proposed a new time for ${appointment.pets?.name}'s appointment: ${proposedDate} ${proposedTimeRange}${proposedExactTime ? ` at ${proposedExactTime}` : ''}`,
      appointment_id: appointmentId,
      is_read: false,
      read: false
    };
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationData);
    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating time proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointmentId');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }
    const { data: proposals, error } = await supabase
      .from('time_proposals')
      .select(`*, profiles!time_proposals_vet_id_fkey(first_name, last_name)`)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ proposals });
  } catch (error: any) {
    console.error('Error fetching time proposals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 