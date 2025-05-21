import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(userData: any, req: NextRequest) {
  try {
    logger.info('Creating new user', { email: userData.email, role: userData.role }, req);

    // 1. Check if user exists in Supabase Auth
    const { data: existingAuthUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    if (authListError) {
      logger.error('Error checking for existing users in auth', { error: authListError.message }, req);
      return NextResponse.json({ error: authListError.message }, { status: 500 });
    }
    const authEmailExists = existingAuthUsers && existingAuthUsers.users && existingAuthUsers.users.some(user => user.email?.toLowerCase() === userData.email.toLowerCase());
    if (authEmailExists) {
      logger.warn('User with this email already exists in auth', { email: userData.email }, req);
      return NextResponse.json(
        { error: 'A user with this email already exists', code: 'user_exists' },
        { status: 409 }
      );
    }

    // 2. Check if user exists in the users table
    const { data: existingDbUser, error: dbCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', userData.email)
      .maybeSingle();
    if (dbCheckError) {
      logger.error('Error checking existing user in database', { error: dbCheckError.message, email: userData.email }, req);
    }
    if (existingDbUser) {
      logger.warn('User exists in database but not in auth', { email: userData.email, id: existingDbUser.id }, req);
      return NextResponse.json(
        { error: 'A user with this email already exists in the system', code: 'user_exists_db' },
        { status: 409 }
      );
    }

    // 3. Create the user in Supabase Auth
    const tempPassword = userData.password || (Math.random().toString(36).slice(-8) + "A1!");
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role
      }
    });
    if (authError) {
      logger.error('Failed to create auth user', { error: authError.message, email: userData.email }, req);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    if (!authUser.user) {
      logger.error('Auth user created but user object is missing', { email: userData.email }, req);
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }
    logger.debug('Auth user created successfully, attempting database insert', {
      authUserId: authUser.user.id,
      email: userData.email
    }, req);

    // 4. Insert into users table using upsert to avoid PK conflict
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || null,
        role: userData.role,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
    if (dbError) {
      logger.error('Database insert failed with detailed info', {
        error: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
        authUserId: authUser.user.id,
        email: userData.email
      }, req);
      // Clean up auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (deleteError) {
        logger.error('Failed to clean up auth user after database error', {
          error: String(deleteError),
          userId: authUser.user.id
        }, req);
      }
      return NextResponse.json({ error: `Failed to create user in database: ${dbError.message}` }, { status: 400 });
    }

    // 5. Handle email sending if requested
    if (userData.send_email) {
      try {
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: userData.email
        });
        if (resetError) {
          logger.error('Error sending password reset email', {
            error: resetError.message,
            email: userData.email
          }, req);
        }
      } catch (emailError) {
        logger.error('Failed to send welcome email', {
          error: String(emailError),
          email: userData.email
        }, req);
      }
    }

    logger.info('User created successfully', { userId: authUser.user.id, email: userData.email }, req);
    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role
      }
    });
  } catch (error: any) {
    logger.error('Unexpected error in createUser', { error: error.message }, req);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    // First, check if the user exists in both places
    let authUserExists = true;
    let dbUserExists = true;
    let authDeleteError = null;

    // Check if user exists in Auth
    const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authCheckError || !authUser.user) {
      logger.warn('User not found in Auth system', { userId, error: authCheckError?.message }, req);
      authUserExists = false;
    }

    // Check if user exists in the database
    const { data: dbUser, error: dbCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (dbCheckError) {
      logger.error('Error checking user in database', { error: dbCheckError.message, userId }, req);
    }
    if (!dbUser) {
      logger.warn('User not found in database', { userId }, req);
      dbUserExists = false;
    }

    // If user doesn't exist in both places, return error
    if (!authUserExists && !dbUserExists) {
      logger.error('User not found in both Auth and database', { userId }, req);
      return NextResponse.json({ error: 'User not found in the system', code: 'user_not_found' }, { status: 404 });
    }

    // Delete from Auth if exists
    if (authUserExists) {
      const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteErr) {
        logger.error('Failed to delete user from Auth', { error: authDeleteErr.message, userId }, req);
        authDeleteError = authDeleteErr;
        // Continue with database deletion even if Auth deletion fails
        logger.warn('Continuing with database deletion despite Auth deletion failure', { userId }, req);
      } else {
        logger.info('User deleted from Auth successfully', { userId }, req);
      }
    }

    // Delete from database if exists
    let dbDeleteError = null;
    if (dbUserExists) {
      const { error: dbDeleteErr } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
      if (dbDeleteErr) {
        logger.error('Failed to delete user from database', { error: dbDeleteErr.message, userId }, req);
        dbDeleteError = dbDeleteErr;
        return NextResponse.json({
          error: `Failed to delete user from database: ${dbDeleteErr.message}`,
          authDeleted: authUserExists && !authDeleteError,
        }, { status: 500 });
      }
      logger.info('User deleted from database successfully', { userId }, req);
    }

    // Success - deleted from at least one place
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      details: {
        authUserDeleted: authUserExists && !authDeleteError,
        dbUserDeleted: dbUserExists && !dbDeleteError
      }
    });
  } catch (error: any) {
    logger.error('Unexpected error in deleteUser', { error: error.message, userId }, req);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
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