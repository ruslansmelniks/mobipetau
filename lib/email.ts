import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.resend.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'resend',
    pass: process.env.EMAIL_PASSWORD || process.env.RESEND_API_KEY,
  },
});

type WelcomeEmailProps = {
  email: string;
  firstName: string;
  temporaryPassword: string;
  role: string;
};

export async function sendWelcomeEmail({ email, firstName, temporaryPassword, role }: WelcomeEmailProps) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"MobiPet" <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to MobiPet - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to MobiPet, ${firstName}!</h2>
          <p>Your account has been created with the following details:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
            <li><strong>Role:</strong> ${role}</li>
          </ul>
          <p>Please log in and change your password as soon as possible.</p>
          <p>Best regards,<br>The MobiPet Team</p>
        </div>
      `
    };
    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
} 