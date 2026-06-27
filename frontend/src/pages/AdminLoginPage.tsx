import React, { useState } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { ShieldAlert, Mail, KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/admin/request-otp', { email });
      toast.success('Admin login code sent successfully!');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await api.post('/admin/verify-otp', { email, otp });
      const { accessToken, user } = res.data.data;
      
      // Save admin session in store
      setAuth(user, accessToken);
      toast.success('Logged in successfully to admin panel!');
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="mx-auto h-16 w-16 bg-[var(--color-bg-sidebar)] rounded-[var(--radius-lg)] flex items-center justify-center mb-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
          <ShieldAlert className="text-[var(--color-accent)] w-8 h-8" />
        </div>
        <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] tracking-tight">
          Platform Administration
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Authorized personnel only
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center px-4 sm:px-0">
        <div className="w-full bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-8">
          <div className="text-center mb-8">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">Admin Console</h2>
            <p className="text-[var(--color-text-secondary)] text-[var(--text-sm)] mt-2">
              {step === 'request' 
                ? 'Request secure access code' 
                : `Enter the code sent to ${email}`}
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
                  Admin Email Address
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
                    placeholder="admin@yourpos.com"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-10 flex justify-center items-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Send Access Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="otp" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input
                    id="otp"
                    autoFocus
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
                disabled={loading || otp.length !== 6}
                className="w-full h-10 flex justify-center items-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Verify & Log In'
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
      </div>
    </div>
  );
};
