import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface RouteParams {
  params: { id: string }
}

export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
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
    const { id: proposalId } = await params;
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

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
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
    console.log('=== DELETE PROPOSAL START ===');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('AUTH ERROR:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authenticated user:', user.id);
    // Await params before accessing properties
    const { id: proposalId } = await params;
    console.log('DELETE request for proposal ID:', proposalId);
    console.log('User requesting deletion:', user.id);
    // First, check if proposal exists
    console.log('STEP 1: Checking if proposal exists...');
    const { data: proposalCheck, error: checkError } = await supabase
      .from('time_proposals')
      .select('*')
      .eq('id', proposalId);
    console.log('Proposal check result:', proposalCheck);
    console.log('Proposal check error:', checkError);
    // Get proposal to verify ownership
    console.log('STEP 2: Getting proposal with ownership check...');
    const { data: proposal, error: proposalError } = await supabase
      .from('time_proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('vet_id', user.id)
      .single();
    console.log('Found proposal:', proposal);
    console.log('Proposal query error:', proposalError);
    if (proposalError) {
      console.log('PROPOSAL ERROR DETAILS:', JSON.stringify(proposalError, null, 2));
      return NextResponse.json({ 
        error: `Proposal error: ${proposalError.message}` 
      }, { status: 404 });
    }
    if (!proposal) {
      console.log('NO PROPOSAL FOUND - Either doesn\'t exist or wrong owner');
      return NextResponse.json({ 
        error: 'Proposal not found or access denied' 
      }, { status: 404 });
    }
    console.log('STEP 3: Checking proposal status...');
    console.log('Proposal status:', proposal.status);
    // Only allow withdrawal of pending proposals
    if (proposal.status !== 'pending') {
      console.log('CANNOT WITHDRAW - Status is not pending:', proposal.status);
      return NextResponse.json({ 
        error: `Can only withdraw pending proposals. Current status: ${proposal.status}` 
      }, { status: 400 });
    }
    // Delete the proposal
    console.log('STEP 4: Attempting to delete proposal...');
    console.log('Deleting proposal with ID:', proposalId);
    const { data: deleteData, error: deleteError } = await supabase
      .from('time_proposals')
      .delete()
      .eq('id', proposalId)
      .select(); // Add select() to see what was deleted
    console.log('Delete operation result:', deleteData);
    console.log('Delete operation error:', deleteError);
    if (deleteError) {
      console.error('DELETE ERROR DETAILS:', JSON.stringify(deleteError, null, 2));
      return NextResponse.json({ 
        error: `Delete failed: ${deleteError.message}` 
      }, { status: 500 });
    }
    console.log('STEP 5: Verifying deletion...');
    // Verify the proposal was actually deleted
    const { data: verifyData, error: verifyError } = await supabase
      .from('time_proposals')
      .select('*')
      .eq('id', proposalId);
    console.log('Verification check - should be empty:', verifyData);
    console.log('Verification error:', verifyError);
    console.log('=== DELETE PROPOSAL SUCCESS ===');
    return NextResponse.json({ 
      success: true, 
      deletedProposal: deleteData,
      verification: verifyData 
    });
  } catch (error: any) {
    console.error('=== DELETE PROPOSAL ERROR ===');
    console.error('Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 