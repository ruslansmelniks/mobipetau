import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, action } = await req.json();
    
    if (!appointmentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('*, pets:pet_id(name)')
      .eq('id', appointmentId)
      .single();
      
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    let newStatus;
    if (action === 'accept_proposal') {
      // Owner accepted the proposed time, update the appointment
      newStatus = 'confirmed';
      await supabaseAdmin
        .from('appointments')
        .update({
          status: newStatus,
          date: appointment.proposed_date,
          time_slot: appointment.proposed_time,
          proposed_date: null,
          proposed_time: null,
          proposed_message: null,
        })
        .eq('id', appointmentId);
    } else if (action === 'decline_proposal') {
      // Owner declined the proposal, cancel the appointment
      newStatus = 'cancelled';
      await supabaseAdmin
        .from('appointments')
        .update({
          status: newStatus,
          proposed_date: null,
          proposed_time: null,
          proposed_message: null,
        })
        .eq('id', appointmentId);
    }
    
    return NextResponse.json({ success: true, newStatus });
  } catch (error: any) {
    logger.error('Error in owner response API', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 