import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

type WelcomeEmailProps = {
  email: string;
  firstName: string;
  temporaryPassword: string;
  role: string;
};

export async function sendWelcomeEmail({ email, firstName, temporaryPassword, role }: WelcomeEmailProps) {
  const roleText = role === 'pet_owner' ? 'Pet Owner' : role === 'vet' ? 'Veterinarian' : 'Administrator';
  const mailOptions = {
    from: `"MobiPet" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to MobiPet - Your Account Details',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4e968f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to MobiPet</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello ${firstName},</p>
          <p>Your MobiPet account has been created. You've been registered as a <strong>${roleText}</strong>.</p>
          <p>Here are your login details:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
          </ul>
          <p>Please log in and change your temporary password as soon as possible for security reasons.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" 
               style="background-color: #4e968f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Log In Now
            </a>
          </div>
          <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The MobiPet Team</p>
        </div>
        <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} MobiPet. All rights reserved.
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
} 