import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('=== CLEARING ALL DATA ===');
    
    // Clear notifications
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (notifError) {
      console.error('Error clearing notifications:', notifError);
    } else {
      console.log('Notifications cleared successfully');
    }
    
    // Clear appointments
    const { error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (appointmentError) {
      console.error('Error clearing appointments:', appointmentError);
    } else {
      console.log('Appointments cleared successfully');
    }
    
    // Clear time proposals
    const { error: proposalError } = await supabaseAdmin
      .from('time_proposals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (proposalError) {
      console.error('Error clearing time proposals:', proposalError);
    } else {
      console.log('Time proposals cleared successfully');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'All data cleared successfully',
      cleared: {
        notifications: !notifError,
        appointments: !appointmentError,
        timeProposals: !proposalError
      }
    });
    
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
} 