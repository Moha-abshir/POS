import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER || '',
    pass: process.env.BREVO_SMTP_KEY || '',
  },
});

export class EmailService {
  static async sendOtpEmail(email: string, otp: string) {
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
      console.log(`[MOCK EMAIL] To: ${email} | OTP: ${otp}`);
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: '"Hardware Store" <onboarding@abshir-pos.com>', // Replace with your verified Brevo sender email
        to: email,
        subject: 'Your Login Code',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Hardware Store POS Login</h2>
            <p>Your one-time password is:</p>
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #d97706;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      
      console.log('Message sent: %s', info.messageId);
    } catch (error: any) {
      console.error('Failed to send email via Brevo:', error);
      throw new Error(error.message || 'Failed to send OTP email');
    }
  }
}
