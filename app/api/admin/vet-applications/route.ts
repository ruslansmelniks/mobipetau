import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { sendWelcomeEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { action, applicationId, password, sendEmail, notes } = await req.json();

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: 'Application ID and action are required' },
        { status: 400 }
      );
    }

    // Get the application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('vet_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Create user account
      const tempPassword = password || (Math.random().toString(36).slice(-8) + "A1!");
      
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: application.full_name.split(' ')[0],
          last_name: application.full_name.split(' ').slice(1).join(' '),
          phone: application.phone,
          role: 'vet',
          license_number: application.license_number,
          years_experience: application.years_experience,
          specialties: application.specialties,
          bio: application.bio
        }
      });

      if (authError) {
        logger.error('Failed to create vet user account', { error: authError.message });
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      // Insert into users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user!.id,
          email: application.email,
          first_name: application.full_name.split(' ')[0],
          last_name: application.full_name.split(' ').slice(1).join(' '),
          phone: application.phone,
          role: 'vet',
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        // Clean up auth user if DB insert fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id);
        logger.error('Failed to create user in database', { error: dbError.message });
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      // Update application status
      await supabaseAdmin
        .from('vet_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          notes: notes || 'Application approved and user account created'
        })
        .eq('id', applicationId);

      // Send welcome email if requested
      if (sendEmail) {
        try {
          await sendWelcomeEmail({
            email: application.email,
            firstName: application.full_name.split(' ')[0],
            temporaryPassword: tempPassword,
            role: 'vet'
          });
        } catch (emailError) {
          logger.error('Failed to send welcome email', { error: emailError });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Application approved and user account created',
        userId: authUser.user!.id,
        password: sendEmail ? null : tempPassword
      });

    } else if (action === 'decline') {
      // Update application status to declined
      await supabaseAdmin
        .from('vet_applications')
        .update({
          status: 'declined',
          reviewed_at: new Date().toISOString(),
          notes: notes || 'Application declined'
        })
        .eq('id', applicationId);

      return NextResponse.json({
        success: true,
        message: 'Application declined'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    logger.error('Error in vet application management API', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 