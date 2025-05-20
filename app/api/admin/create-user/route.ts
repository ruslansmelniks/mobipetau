import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { sendWelcomeEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, password, first_name, last_name, phone, role, sendEmail } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // First check if the user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 100,
      page: 1
    });
    let userId;
    let isNewUser = true;
    const foundUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      userId = foundUser.id;
      isNewUser = false;
      // Update their metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          first_name,
          last_name,
          role
        }
      });
      // Optionally reset their password if needed
      if (password) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      }
    } else {
      // Create new auth user
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
      userId = authData.user.id;
    }
    // Now check if the user exists in our database table
    const { data: existingDbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    if (existingDbUser) {
      // Update existing user in database
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          first_name,
          last_name,
          phone,
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (updateError) {
        console.error('Error updating user in database:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Insert new user into database
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email,
          first_name,
          last_name,
          phone,
          role,
          created_at: new Date().toISOString(),
        });
      if (dbError) {
        console.error('Error adding user to database:', dbError);
        if (isNewUser) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }
    // Send welcome email with credentials if requested
    if (sendEmail) {
      try {
        // For now, just log the email details
        console.log(`Would send email to ${email} with password ${password}`);
        // Uncomment when email is set up
        // await sendWelcomeEmail({
        //   email,
        //   firstName: first_name,
        //   temporaryPassword: password,
        //   role
        // });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }
    return NextResponse.json({ 
      success: true, 
      user: { id: userId, email, isNewUser } 
    });
  } catch (error: any) {
    console.error('Error in create-user API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 