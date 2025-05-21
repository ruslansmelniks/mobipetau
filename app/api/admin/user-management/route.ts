import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(userData: any, req: NextRequest) {
  try {
    logger.info('Creating new user', { email: userData.email, role: userData.role }, req);
    // First check if user exists in auth
    const { data: existingUsers, error: userCheckError } = await supabaseAdmin.auth.admin.listUsers();
    if (userCheckError) {
      logger.error('Error checking for existing users', { error: userCheckError.message }, req);
      return NextResponse.json({ error: userCheckError.message }, { status: 500 });
    }
    // Check if email already exists in the Auth system
    const emailExists = existingUsers.users.some(user => 
      user.email?.toLowerCase() === userData.email.toLowerCase()
    );
    if (emailExists) {
      logger.error('User with this email already exists', { email: userData.email }, req);
      return NextResponse.json({ 
        error: 'A user with this email address has already been registered',
        code: 'email_exists'
      }, { status: 400 });
    }
    // Prepare user data with a password if provided
    const createUserPayload: any = {
      email: userData.email,
      email_confirm: true,
      user_metadata: {
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone
      }
    };
    if (userData.password) {
      createUserPayload.password = userData.password;
    }
    // Create user in Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser(createUserPayload);
    if (error) {
      logger.error('Failed to create user in Auth', { error: error.message, email: userData.email }, req);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data.user) {
      logger.error('User created but no user object returned', { email: userData.email }, req);
      return NextResponse.json({ error: 'User created but no user object returned' }, { status: 500 });
    }
    // Insert user in database
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || null,
        role: userData.role,
        created_at: new Date().toISOString(),
      });
    if (dbError) {
      // If database insert fails, try to delete the auth user to maintain consistency
      logger.error('Failed to create user in database', { error: dbError.message, email: userData.email }, req);
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(e => {
        logger.error('Failed to clean up auth user after database error', { 
          error: e.message, 
          userId: data.user.id 
        }, req);
      });
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }
    // Send password reset email if requested
    if (userData.send_email) {
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userData.email
      });
      if (resetError) {
        logger.error('Error sending password reset email', { error: resetError.message, email: userData.email }, req);
        // Don't return an error here, as the user was successfully created
      }
    }
    logger.info('User created successfully', { userId: data.user.id, email: userData.email }, req);
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        phone: userData.phone
      }
    });
  } catch (error: any) {
    logger.error('Unexpected error in createUser', { error: error.message }, req);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}

async function updateUser(userData: any, req: NextRequest) {
  try {
    logger.info('Updating user', { userId: userData.id }, req);

    // Check if user exists in Auth
    const { data: authUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userData.id);
    if (fetchError || !authUser?.user) {
      logger.error('User not found in Auth', { userId: userData.id, fetchError }, req);
      return NextResponse.json({ error: 'User not found in authentication system.' }, { status: 404 });
    }
    // Update auth user metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
      {
        user_metadata: {
          role: userData.role,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
        },
      }
    );
    if (authError) {
      logger.error('Failed to update user auth metadata', { error: authError.message, userId: userData.id }, req);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    // Update database record without using updated_at
    const updateData = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      phone: userData.phone || null,
    };
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userData.id);
    if (dbError) {
      logger.error('Failed to update user in database', { error: dbError.message, userId: userData.id }, req);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }
    logger.info('User updated successfully', { userId: userData.id }, req);
    return NextResponse.json({ 
      success: true,
      user: {
        id: userData.id,
        email: authUser.user.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        phone: userData.phone,
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