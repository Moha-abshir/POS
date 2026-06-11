import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { requestOtpSchema, verifyOtpSchema, onboardingSchema } from './auth.schema';

export class AuthController {
  static async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = requestOtpSchema.parse(req.body);
      
      await AuthService.requestOtp(email);
      
      res.json({
        success: true,
        message: 'OTP sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      
      const { accessToken, refreshToken, user } = await AuthService.verifyOtp(email, otp);
      
      // Set HttpOnly Secure cookie for refresh token
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.json({
        success: true,
        data: {
          accessToken,
          user,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken && req.user) {
        await AuthService.logout(req.user.id, refreshToken);
      }
      res.clearCookie('refresh_token');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async onboarding(req: Request, res: Response, next: NextFunction) {
    try {
      // The user ID is expected to be attached to req.user by an auth middleware.
      // But wait, the onboarding route should be protected by the requireAuth middleware.
      const userId = (req as any).user.id; // Assuming JWT payload sets req.user
      
      const onboardingData = onboardingSchema.parse(req.body);
      
      await AuthService.onboarding(userId, onboardingData);
      
      res.json({
        success: true,
        message: 'Onboarding completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
