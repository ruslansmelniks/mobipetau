import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { action, userData } = await req.json();
    console.log(`Executing ${action} with data:`, userData);
    switch (action) {
      case 'create':
        return await createUser(userData);
      case 'update':
        return await updateUser(userData);
      case 'delete':
        return await deleteUser(userData.id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Error in user management API:`, error);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}

async function createUser(userData: any) {
  const { email, first_name, last_name, phone, role, send_email } = userData;
  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
  }
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "A1!";
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');
    const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('admin_create_user', {
      user_id: authData.user.id,
      user_email: email,
      user_first_name: first_name || null,
      user_last_name: last_name || null,
      user_phone: phone || null,
      user_role: role
    });
    if (sqlError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw sqlError;
    }
    if (send_email) {
      await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`
      });
    }
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        first_name,
        last_name,
        phone,
        role
      }
    });
  } catch (error: any) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateUser(userData: any) {
  const { id, first_name, last_name, phone, role } = userData;
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        first_name,
        last_name,
        phone,
        role
      }
    });
    if (authError) throw authError;
    const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('admin_update_user', {
      user_first_name: first_name || null,
      user_id: id,
      user_last_name: last_name || null,
      user_phone: phone || null,
      user_role: role
    });
    if (sqlError) throw sqlError;
    return NextResponse.json({
      success: true,
      user: {
        id,
        first_name,
        last_name,
        phone,
        role
      }
    });
  } catch (error: any) {
    console.error('User update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteUser(userId: string) {
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  try {
    const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('admin_delete_user', {
      user_id: userId
    });
    if (sqlError) throw sqlError;
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('User deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 