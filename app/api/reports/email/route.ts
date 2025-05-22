import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

// Initialize Supabase with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { reportId, recipientType } = await req.json();
    
    if (!reportId || !recipientType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate recipientType is either 'vet' or 'pet_owner'
    if (recipientType !== 'vet' && recipientType !== 'pet_owner') {
      return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }

    // Get report with appointment and pet details
    const { data: report, error: reportError } = await supabaseAdmin
      .from('vet_reports')
      .select(`
        *,
        appointment:appointment_id (
          id,
          date,
          time_slot,
          address,
          pet_owner:pet_owner_id (id, email, first_name, last_name),
          pet:pet_id (id, name, type, breed),
          vet:vet_id (id, email, first_name, last_name)
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      logger.error('Error fetching report', { reportId, error: reportError?.message }, req);
      return NextResponse.json(
        { error: reportError?.message || 'Report not found' }, 
        { status: 404 }
      );
    }

    // Get email details based on recipient type
    let recipient, recipientName, includeConfidential;

    if (recipientType === 'vet') {
      recipient = report.appointment.vet.email;
      recipientName = `${report.appointment.vet.first_name} ${report.appointment.vet.last_name}`;
      includeConfidential = true;
    } else {
      recipient = report.appointment.pet_owner.email;
      recipientName = `${report.appointment.pet_owner.first_name} ${report.appointment.pet_owner.last_name}`;
      includeConfidential = false;
    }

    // Format date
    const appointmentDate = new Date(report.appointment.date).toLocaleDateString();
    
    // Generate HTML content for the email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4e968f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MobiPet Veterinary Report</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello ${recipientName},</p>
          
          <p>Here is the veterinary report for ${report.appointment.pet.name} (${report.appointment.pet.type}) from your appointment on ${appointmentDate}.</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Diagnosis</h2>
            <p style="margin-bottom: 15px;">${report.diagnosis}</p>
            
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Treatment</h2>
            <p style="margin-bottom: 15px;">${report.treatment}</p>
            
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Notes</h2>
            <p style="margin-bottom: ${includeConfidential ? '15px' : '0'};">${report.shared_notes || 'No additional notes.'}</p>
            
            ${includeConfidential ? `
              <h2 style="margin-top: 0; color: #333; font-size: 18px;">Confidential Notes (Vet Only)</h2>
              <p style="margin-bottom: 0;">${report.confidential_notes || 'No confidential notes.'}</p>
            ` : ''}
          </div>
          
          ${report.follow_up_recommended ? `
            <div style="margin: 20px 0; padding: 10px; background-color: #e6f7f5; border: 1px solid #b2ebf2; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold;">Follow-up Recommended</p>
              ${report.follow_up_days ? `<p style="margin: 5px 0 0;">Recommended in ${report.follow_up_days} days</p>` : ''}
            </div>
          ` : ''}
          
          ${report.additional_services && report.additional_services.length > 0 ? `
            <div style="margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333; font-size: 18px;">Additional Services & Medication</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f5f5f5; text-align: left;">
                  <th style="padding: 8px; border: 1px solid #ddd;">Service/Medication</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
                </tr>
                ${report.additional_services.map((service: any) => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${service.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${service.description || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${service.price.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold;">
                  <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">Total</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${report.additional_services.reduce((sum: number, s: any) => sum + s.price, 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>
          ` : ''}
          
          <p>Thank you for using MobiPet for your veterinary services.</p>
          
          <p>Best regards,<br>The MobiPet Team</p>
        </div>
        <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} MobiPet. All rights reserved.
        </div>
      </div>
    `;

    // Send the email
    await transporter.sendMail({
      from: `"MobiPet" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: `Veterinary Report for ${report.appointment.pet.name}`,
      html,
    });

    logger.info('Report email sent successfully', { 
      reportId, 
      recipientType,
      recipient 
    }, req);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error sending report email', { error: error.message }, req);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' }, 
      { status: 500 }
    );
  }
} 