import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(userData: any, req: NextRequest) {
  try {
    logger.info('Creating new user', { email: userData.email, role: userData.role }, req);
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        role: userData.role,
        first_name: userData.firstName,
        last_name: userData.lastName,
      },
    });

    if (error) {
      logger.error('Failed to create user', { error: error.message, email: userData.email }, req);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.info('User created successfully', { userId: data.user.id, email: userData.email }, req);
    return NextResponse.json({ user: data.user });
  } catch (error: any) {
    logger.error('Unexpected error in createUser', { error: error.message }, req);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateUser(userData: any, req: NextRequest) {
  try {
    logger.info('Updating user', { userId: userData.id }, req);

    // Pre-check: verify user exists in Auth
    const { data: authUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userData.id);
    if (fetchError || !authUser?.user) {
      logger.error('User not found in Auth', { userId: userData.id, fetchError }, req);
      return NextResponse.json({ error: 'User not found in authentication system.' }, { status: 404 });
    }
    // Update auth metadata
    const { data: updatedUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
      {
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          role: userData.role
        }
      }
    );
    if (authError) {
      logger.error('Failed to update user auth', { error: authError.message, userId: userData.id }, req);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    // Update database record
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
      .select('*')
      .single();
    if (dbError) {
      logger.error('Failed to update user in database', { error: dbError.message, userId: userData.id }, req);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }
    logger.info('User updated successfully', { userId: userData.id }, req);
    // Return the full updated user object
    return NextResponse.json({
      success: true,
      user: dbUser || {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role,
        email: authUser.user.email
      }
    });
  } catch (error: any) {
    logger.error('Unexpected error in updateUser', { error: error.message }, req);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteUser(userId: string, req: NextRequest) {
  try {
    logger.info('Deleting user', { userId }, req);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      logger.error('Failed to delete user', { error: error.message, userId }, req);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.info('User deleted successfully', { userId }, req);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error in deleteUser', { error: error.message }, req);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, userData } = await req.json();
    logger.info(`Processing ${action} action`, { action, userData }, req);

    switch (action) {
      case 'create':
        return await createUser(userData, req);
      case 'update':
        return await updateUser(userData, req);
      case 'delete':
        return await deleteUser(userData.id, req);
      default:
        logger.warn('Invalid action requested', { action }, req);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Error in user management API', { error: error.message }, req);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
} 