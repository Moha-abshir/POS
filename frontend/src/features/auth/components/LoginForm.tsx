import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { useRequestOtp, useVerifyOtp } from '../api/auth.api';
import { useAuthStore } from '../stores/auth.store';
import { Mail, KeyRound, Loader2 } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [errorMsg, setErrorMsg] = useState('');

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await requestOtpMutation.mutateAsync(email);
      setStep('verify');
    } catch (err) {
      setErrorMsg((err as AxiosError<any>).response?.data?.error?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await verifyOtpMutation.mutateAsync({ email, otp });
      setAuth(res.data.user, res.data.accessToken);
    } catch (err) {
      setErrorMsg((err as AxiosError<any>).response?.data?.error?.message || 'Invalid OTP');
    }
  };

  return (
    <div className="w-full bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-8">
      <div className="text-center mb-8">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">Welcome Back</h2>
        <p className="text-[var(--color-text-secondary)] text-[var(--text-sm)] mt-2">
          {step === 'request' 
            ? 'Sign in to your POS terminal' 
            : `We sent a code to ${email}`}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-sm)] text-[var(--text-sm)] font-medium border border-[var(--color-danger-bg)]">
          {errorMsg}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full h-10 pl-10 pr-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] transition-colors text-[var(--color-text-primary)] outline-none focus:ring-4"
                placeholder="owner@store.com"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={requestOtpMutation.isPending || !email}
            className="w-full h-10 flex justify-center items-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
          >
            {requestOtpMutation.isPending ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Send Login Code'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <label htmlFor="otp" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
              6-Digit Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full h-10 pl-10 pr-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-lg)] tracking-[0.4em] font-mono transition-colors text-[var(--color-text-primary)] outline-none focus:ring-4"
                placeholder="123456"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={verifyOtpMutation.isPending || otp.length !== 6}
            className="w-full h-10 flex justify-center items-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
          >
            {verifyOtpMutation.isPending ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Verify & Login'
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep('request')}
            className="w-full text-[var(--text-sm)] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mt-3 transition-colors font-medium bg-transparent select-none cursor-pointer"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
};
