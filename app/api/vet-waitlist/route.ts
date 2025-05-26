import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const applicationData = await req.json();
    
    logger.info('Received vet waitlist application', { 
      email: applicationData.email,
      fullName: applicationData.fullName 
    }, req);

    // Validate required fields
    if (!applicationData.fullName || !applicationData.email) {
      return NextResponse.json(
        { error: 'Full name and email are required' }, 
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingApp, error: checkError } = await supabaseAdmin
      .from('vet_applications')
      .select('id, email')
      .eq('email', applicationData.email)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking existing application', { error: checkError.message }, req);
      return NextResponse.json(
        { error: 'Failed to process application' },
        { status: 500 }
      );
    }

    if (existingApp) {
      return NextResponse.json(
        { error: 'An application with this email already exists' },
        { status: 409 }
      );
    }

    // Insert the application
    const { data: newApplication, error: insertError } = await supabaseAdmin
      .from('vet_applications')
      .insert({
        full_name: applicationData.fullName,
        email: applicationData.email,
        phone: applicationData.phone || null,
        license_number: applicationData.licenseNumber || null,
        years_experience: applicationData.yearsExperience || null,
        specialties: applicationData.specialties || [],
        location: applicationData.location || null,
        bio: applicationData.bio || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error inserting vet application', { error: insertError.message }, req);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    logger.info('Vet application submitted successfully', { 
      applicationId: newApplication.id,
      email: applicationData.email 
    }, req);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: newApplication.id
    });

  } catch (error: any) {
    logger.error('Unexpected error in vet waitlist API', { error: error.message }, req);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get all pending applications for admin dashboard
    const { data: applications, error } = await supabaseAdmin
      .from('vet_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching vet applications', { error: error.message }, req);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications });

  } catch (error: any) {
    logger.error('Unexpected error fetching applications', { error: error.message }, req);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 