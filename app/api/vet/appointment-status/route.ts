import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('=== APPOINTMENT STATUS API DEBUG ===');
  console.log('1. Headers:', Object.fromEntries(req.headers.entries()));
  console.log('2. Method:', req.method);
  try {
    // Try to get the body first
    const body = await req.json();
    console.log('3. Body:', body);
    // Check for authorization header
    const authHeader = req.headers.get('authorization');
    console.log('4. Auth header:', authHeader);
    // Check for custom headers from middleware
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    console.log('5. Middleware headers:', { userId, userRole });
    // Now let's see what's actually causing the 401
    // Add your existing authentication code here but with more logging
    // If you're using the auth header approach:
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('6. FAILING: No valid auth header');
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 });
    }

    if (!userId || userRole !== 'vet') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body (already done above)
    const { appointmentId, status, action } = body;

    // Update appointment status
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ 
        status: status,
        vet_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error: any) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment status' },
      { status: 500 }
    );
  }
} 