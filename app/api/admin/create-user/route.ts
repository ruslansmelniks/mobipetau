import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { sendWelcomeEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, first_name, last_name, phone, role, send_email } = await req.json();
    if (!email || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Generate a secure random password for the user
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "A1!";
    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone,
        role
      }
    });
    if (authError) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json({ error: `Failed to create auth user: ${authError.message}` }, { status: 500 });
    }
    if (!authUser.user) {
      return NextResponse.json({ error: 'User created in auth but user object is missing' }, { status: 500 });
    }
    // Now insert the user into the users table (no updated_at field)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        phone: phone || null,
        role,
        created_at: new Date().toISOString(),
      });
    if (dbError) {
      console.error("Database user creation error:", dbError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Failed to create database user: ${dbError.message}` }, { status: 500 });
    }
    // Send password reset email if requested
    if (send_email) {
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email
      });
      if (resetError) {
        console.error("Error sending password reset email:", resetError);
      }
    }
    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        phone,
        role
      }
    });
  } catch (error: any) {
    console.error("Unexpected error creating user:", error);
    return NextResponse.json({ error: `Unexpected error: ${error.message}` }, { status: 500 });
  }
} 