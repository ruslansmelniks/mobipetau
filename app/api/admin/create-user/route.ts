import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, password, first_name, last_name, phone, role, sendEmail } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role
      }
    });
    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        phone,
        role,
        created_at: new Date().toISOString(),
      });
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    if (sendEmail) {
      try {
        await sendWelcomeEmail({
          email,
          firstName: first_name,
          temporaryPassword: password,
          role
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }
    return NextResponse.json({ 
      success: true, 
      user: { id: authData.user.id, email } 
    });
  } catch (error: any) {
    console.error('Error in create-user API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 