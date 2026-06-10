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
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await verifyOtpMutation.mutateAsync({ email, otp });
      setAuth(res.data.user, res.data.accessToken);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error?.message || 'Invalid OTP');
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-500 text-sm mt-2">
          {step === 'request' 
            ? 'Sign in to your POS dashboard' 
            : `We sent a code to ${email}`}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {errorMsg}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="owner@store.com"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={requestOtpMutation.isPending || !email}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {requestOtpMutation.isPending ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Send Login Code'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              6-Digit Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm tracking-[0.5em] font-mono transition-colors"
                placeholder="123456"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={verifyOtpMutation.isPending || otp.length !== 6}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            className="w-full text-sm text-gray-500 hover:text-gray-900 mt-2 transition-colors"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
};
