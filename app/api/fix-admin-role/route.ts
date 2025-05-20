import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    // Get info from request body
    const { userId, email } = await req.json();
    
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either userId or email is required' }, 
        { status: 400 }
      );
    }
    
    // Find user
    let user;
    if (userId) {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      user = data.user;
    } else if (email) {
      // Get user by email
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      
      user = usersData.users.find(u => u.email === email);
      if (!user) {
        return NextResponse.json(
          { error: `No user found with email: ${email}` }, 
          { status: 404 }
        );
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }
    
    // Update auth metadata
    const { data: metadataUpdateData, error: metadataError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, role: 'admin' } }
    );
    
    if (metadataError) {
      return NextResponse.json(
        { error: `Failed to update user metadata: ${metadataError.message}` }, 
        { status: 500 }
      );
    }
    
    // Update database role
    const { data: dbUpdateData, error: dbError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id);
      
    if (dbError) {
      return NextResponse.json(
        { error: `Failed to update database user role: ${dbError.message}` }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User role updated to admin in both auth metadata and database',
      user: {
        id: user.id,
        email: user.email,
        updated_metadata: metadataUpdateData
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` }, 
      { status: 500 }
    );
  }
} 