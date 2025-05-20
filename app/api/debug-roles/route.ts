import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client with your project URL and service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserMap {
  [key: string]: User;
}

export async function GET(req: NextRequest) {
  try {
    // Get users table data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });
      
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }
    
    // Get auth users data for comparison
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ 
        error: "Error fetching auth users, but users table data available",
        users 
      });
    }
    
    // Create a mapping for easier comparison
    const userMap = (users || []).reduce<UserMap>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
    
    // Combine data for output
    const combinedData = authUsers.users.map(authUser => {
      return {
        id: authUser.id,
        email: authUser.email,
        auth_role: authUser.role,
        metadata_role: authUser.user_metadata?.role,
        db_role: userMap[authUser.id]?.role || "NOT FOUND IN DB",
        created_at: authUser.created_at,
      };
    });
    
    return NextResponse.json({ 
      users_count: users?.length || 0,
      auth_users_count: authUsers.users.length,
      user_data: combinedData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 