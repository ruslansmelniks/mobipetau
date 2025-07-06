import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface RouteParams {
  params: { id: string }
}

export async function PATCH(
  req: NextRequest, 
  { params }: RouteParams
) {
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
    const { status } = await req.json();
    const proposalId = params.id;
    if (!['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const { data: proposal, error: proposalError } = await supabase
      .from('time_proposals')
      .select(`*, appointments(pet_owner_id, pets(name)), profiles!time_proposals_vet_id_fkey(first_name, last_name)`)
      .eq('id', proposalId)
      .single();
    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.appointments.pet_owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { error: updateError } = await supabase
      .from('time_proposals')
      .update({ status })
      .eq('id', proposalId);
    if (updateError) throw updateError;
    if (status === 'accepted') {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          date: proposal.proposed_date,
          time_of_day: proposal.proposed_time_range,
          time: proposal.proposed_exact_time,
          vet_id: proposal.vet_id,
          status: 'confirmed'
        })
        .eq('id', proposal.appointment_id);
      if (appointmentError) throw appointmentError;
      const { error: declineError } = await supabase
        .from('time_proposals')
        .update({ status: 'declined' })
        .eq('appointment_id', proposal.appointment_id)
        .neq('id', proposalId);
      if (declineError) console.error('Error declining other proposals:', declineError);
    }
    const notificationData = {
      user_id: proposal.vet_id,
      type: status === 'accepted' ? 'time_proposal_accepted' : 'time_proposal_declined',
      title: status === 'accepted' ? 'Time Proposal Accepted' : 'Time Proposal Declined',
      message: status === 'accepted' 
        ? `Your proposed time for ${proposal.appointments.pets.name}'s appointment has been accepted!`
        : `Your proposed time for ${proposal.appointments.pets.name}'s appointment has been declined.`,
      appointment_id: proposal.appointment_id,
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
    console.error('Error updating time proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 