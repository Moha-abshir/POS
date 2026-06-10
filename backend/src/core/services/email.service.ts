import * as dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  static async sendOtpEmail(email: string, otp: string) {
    if (!process.env.BREVO_API_KEY) {
      console.log(`[MOCK EMAIL] To: ${email} | OTP: ${otp}`);
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: "Hardware Store POS", 
            email: "onboarding@abshir-pos.com" // Update if you verify a different domain in Brevo
          },
          to: [{ email: email }],
          subject: 'Your Login Code',
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Hardware Store POS Login</h2>
              <p>Your one-time password is:</p>
              <h1 style="font-size: 32px; letter-spacing: 4px; color: #d97706;">${otp}</h1>
              <p>This code will expire in 5 minutes.</p>
              <p>If you did not request this, please ignore this email.</p>
            </div>
          `
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Brevo API Error:', errorData);
        throw new Error(errorData.message || 'Failed to send email via Brevo API');
      }

      console.log(`Successfully sent OTP to ${email} via Brevo HTTP API`);
    } catch (error: any) {
      console.error('Failed to send email via Brevo API:', error);
      throw new Error(error.message || 'Failed to send OTP email');
    }
  }
}
