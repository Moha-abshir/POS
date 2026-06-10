import { Resend } from 'resend';
import * as dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export class EmailService {
  static async sendOtpEmail(email: string, otp: string) {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[MOCK EMAIL] To: ${email} | OTP: ${otp}`);
      return;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'Hardware Store <onboarding@resend.dev>', // In production, use a verified domain
        to: email,
        subject: 'Your Login Code',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Hardware Store POS Login</h2>
            <p>Your one-time password is:</p>
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #2563eb;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      
      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      throw new Error(error.message || 'Failed to send OTP email');
    }
  }
}
