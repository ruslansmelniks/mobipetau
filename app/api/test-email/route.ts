import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }
    await sendEmail(
      to,
      'Test Email from MobiPet',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4e968f; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MobiPet Email Test</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hello!</p>
            <p>This is a test email to verify that MobiPet's email system is working correctly.</p>
            <p>If you received this, the email configuration is successful!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 12px; color: #666;">Sent from MobiPet using Resend</p>
          </div>
        </div>
      `
    );
    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send test email' }, { status: 500 });
  }
} 