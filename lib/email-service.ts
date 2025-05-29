import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'MobiPet <noreply@mobipet.com.au>',
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
};

export const emailTemplates = {
  appointmentAccepted: (
    petOwnerName: string,
    petName: string,
    appointmentDate: string,
    appointmentTime: string
  ) => ({
    subject: 'MobiPet: Your Appointment Has Been Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Appointment Confirmed!</h2>
        <p>Dear ${petOwnerName},</p>
        <p>Your appointment for ${petName} has been confirmed by the veterinarian.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
        </div>
        <p>You can view the full details of your appointment by logging into your MobiPet account.</p>
        <p>Best regards,<br>The MobiPet Team</p>
      </div>
    `,
  }),

  appointmentDeclined: (
    petOwnerName: string,
    petName: string,
    appointmentDate: string,
    appointmentTime: string,
    declinedBy: string,
    reason: string
  ) => ({
    subject: 'MobiPet: Your Appointment Has Been Declined',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">Appointment Declined</h2>
        <p>Dear ${petOwnerName},</p>
        <p>We regret to inform you that your appointment for ${petName} has been declined by the ${declinedBy}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please log in to your MobiPet account to book a new appointment.</p>
        <p>Best regards,<br>The MobiPet Team</p>
      </div>
    `,
  }),

  timeProposed: (
    petOwnerName: string,
    petName: string,
    originalDate: string,
    originalTime: string,
    proposedDate: string,
    proposedTime: string,
    message: string = 'No additional message provided'
  ) => ({
    subject: 'MobiPet: New Time Proposed for Your Appointment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">New Time Proposed</h2>
        <p>Dear ${petOwnerName},</p>
        <p>The veterinarian has proposed a new time for your appointment with ${petName}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Original Time:</strong> ${originalDate} at ${originalTime}</p>
          <p><strong>Proposed Time:</strong> ${proposedDate} at ${proposedTime}</p>
          <p><strong>Message from vet:</strong> ${message}</p>
        </div>
        <p>Please log in to your MobiPet account to accept or decline this proposal.</p>
        <p>Best regards,<br>The MobiPet Team</p>
      </div>
    `,
  }),

  appointmentCompleted: (petOwnerName: string, petName: string, date: string, vetName: string, sharedNotes?: string, followUpInfo?: string) => ({
    subject: `Appointment for ${petName} completed - Visit Summary`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4e968f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MobiPet</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello ${petOwnerName},</p>
          <p>Your appointment for ${petName} on ${date} has been completed. Thank you for using MobiPet!</p>
          <div style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">Visit Summary</h3>
            <p style="margin: 5px 0;"><strong>Veterinarian:</strong> ${vetName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            ${sharedNotes ? `
              <div style="margin-top: 15px;">
                <h4 style="margin-bottom: 5px; color: #2e7d32;">Notes from your Veterinarian:</h4>
                <p style="background-color: white; padding: 10px; border-radius: 4px;">${sharedNotes}</p>
              </div>
            ` : ''}
            ${followUpInfo ? `
              <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">
                <h4 style="margin-top: 0; color: #0d47a1;">Follow-up Recommended</h4>
                ${followUpInfo}
              </div>
            ` : ''}
          </div>
          <p>You can view the complete details of this appointment, including any additional services and costs, in your MobiPet account.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/portal/bookings" style="background-color: #4e968f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              View Appointment Details
            </a>
          </div>
          <p style="margin-top: 20px;">If you have any questions about your pet's treatment or follow-up care, please don't hesitate to contact us.</p>
          <p>Thank you for trusting us with your pet's healthcare.</p>
          <p>Best regards,<br>The MobiPet Team</p>
        </div>
        <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} MobiPet. All rights reserved.
        </div>
      </div>
    `,
  }),

  vetReportCopy: (vetName: string, petName: string, petOwnerName: string, date: string, diagnosis: string, treatment: string, sharedNotes: string, confidentialNotes: string, followUpInfo?: string) => ({
    subject: `Medical Report Copy - ${petName} (${date})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4e968f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MobiPet - Veterinary Report</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello Dr. ${vetName},</p>
          <p>This is a copy of the veterinary report you submitted for your appointment with ${petName}.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; margin: 20px 0;">
            <h3 style="border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Appointment Details</h3>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Owner:</strong> ${petOwnerName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <h3 style="border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-top: 20px;">Clinical Record</h3>
            <div style="margin-top: 15px;">
              <h4>Diagnosis:</h4>
              <p style="background-color: white; padding: 10px; border-radius: 4px;">${diagnosis}</p>
            </div>
            <div style="margin-top: 15px;">
              <h4>Treatment:</h4>
              <p style="background-color: white; padding: 10px; border-radius: 4px;">${treatment}</p>
            </div>
            <div style="margin-top: 15px;">
              <h4>Notes Shared with Owner:</h4>
              <p style="background-color: white; padding: 10px; border-radius: 4px;">${sharedNotes}</p>
            </div>
            <div style="margin-top: 15px;">
              <h4>Confidential Notes:</h4>
              <p style="background-color: white; padding: 10px; border-radius: 4px;">${confidentialNotes}</p>
            </div>
            ${followUpInfo ? `
              <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">
                <h4 style="margin-top: 0;">Follow-up Information</h4>
                ${followUpInfo}
              </div>
            ` : ''}
          </div>
          <p>You can access the complete appointment details and make updates if needed through your MobiPet account.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/vet/appointments" style="background-color: #4e968f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              View in MobiPet
            </a>
          </div>
          <p style="margin-top: 20px;">Thank you for providing excellent care through MobiPet!</p>
          <p>Best regards,<br>The MobiPet Team</p>
        </div>
        <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} MobiPet. All rights reserved.
        </div>
      </div>
    `,
  }),
};

// Helper functions to send specific email types
export async function sendAppointmentAcceptedEmail(
  petOwnerEmail: string,
  petOwnerName: string,
  petName: string,
  date: string,
  time: string
): Promise<void> {
  const { subject, html } = emailTemplates.appointmentAccepted(
    petOwnerName,
    petName,
    date,
    time
  );
  await sendEmail(petOwnerEmail, subject, html);
}

export async function sendTimeProposedEmail(
  petOwnerEmail: string,
  petOwnerName: string,
  petName: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string,
  message?: string
): Promise<void> {
  const { subject, html } = emailTemplates.timeProposed(
    petOwnerName,
    petName,
    oldDate,
    oldTime,
    newDate,
    newTime,
    message
  );
  await sendEmail(petOwnerEmail, subject, html);
}

export async function sendAppointmentCompletedEmail(
  petOwnerEmail: string,
  petOwnerName: string,
  petName: string,
  date: string,
  vetName: string,
  sharedNotes?: string,
  followUpInfo?: string
): Promise<void> {
  const { subject, html } = emailTemplates.appointmentCompleted(
    petOwnerName,
    petName,
    date,
    vetName,
    sharedNotes,
    followUpInfo
  );
  await sendEmail(petOwnerEmail, subject, html);
}

export async function sendAppointmentDeclinedEmail(
  petOwnerEmail: string,
  petOwnerName: string,
  petName: string,
  date: string,
  time: string,
  vetName: string,
  message?: string
): Promise<void> {
  const { subject, html } = emailTemplates.appointmentDeclined(
    petOwnerName,
    petName,
    date,
    time,
    vetName,
    message
  );
  await sendEmail(petOwnerEmail, subject, html);
} 