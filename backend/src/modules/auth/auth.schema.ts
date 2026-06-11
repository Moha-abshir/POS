import { z } from 'zod';

export const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const onboardingSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  mobileNumber: z.string().regex(/^(?:\+254|0)[17]\d{8}$/, 'Invalid mobile number format. Must be a valid Kenyan number (e.g. 07... or +254...).'),
  organizationName: z.string().min(1, 'Organization name is required').max(255),
  sector: z.string().min(1, 'Sector is required').max(100),
  businessPhone: z.string().regex(/^(?:\+254|0)[17]\d{8}$/, 'Invalid business phone format. Must be a valid Kenyan number (e.g. 07... or +254...).'),
  location: z.string().min(1, 'Location is required'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
