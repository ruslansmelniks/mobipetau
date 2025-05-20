import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    const { data: tablesData, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10);
      
    if (tablesError) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection error', 
        error: tablesError
      }, { status: 500 });
    }
    
    const tables = tablesData.map(t => t.table_name);
    
    // Check for required tables
    const requiredTables = ['users', 'pets', 'appointments'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      return NextResponse.json({ 
        status: 'warning', 
        message: 'Missing required tables',
        tables,
        missingTables
      }, { status: 200 });
    }
    
    // Check admin users
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(5);
      
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      tables,
      adminCount: adminUsers?.length || 0
    }, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Health check failed', 
      error: String(error)
    }, { status: 500 });
  }
} 