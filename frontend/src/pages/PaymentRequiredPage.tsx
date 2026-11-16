import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { CreditCard, Phone, MessageCircle, LogOut, RefreshCw, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const PaymentRequiredPage: React.FC = () => {
  const { user, logout, setAuth } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [businessData, setBusinessData] = useState<{
    name?: string;
    amountDue?: string | number | null;
    reason?: string | null;
  }>({
    name: user?.businessName,
    amountDue: user?.paymentAmountDue,
    reason: user?.paymentLockReason,
  });

  const fetchLatestDetails = async () => {
    try {
      const res = await api.get('/auth/me');
      const { business } = res.data.data;
      if (business) {
        setBusinessData({
          name: business.name,
          amountDue: business.paymentAmountDue,
          reason: business.paymentLockReason,
        });

        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken && user) {
          setAuth({
            ...user,
            businessName: business.name,
            businessStatus: business.status,
            isPaymentLocked: business.isPaymentLocked,
            paymentLockReason: business.paymentLockReason,
            paymentAmountDue: business.paymentAmountDue,
          }, currentToken);
        }

        // If the admin unlocked the business, redirect to dashboard immediately
        if (!business.isPaymentLocked && business.status === 'active') {
          toast.success('Payment confirmed! Full access has been restored.');
          window.location.href = '/';
        }
      }
    } catch (err) {
      console.error('Failed to load business details:', err);
    }
  };

  useEffect(() => {
    fetchLatestDetails();
  }, []);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/auth/me');
      const { business } = res.data.data;

      const currentToken = useAuthStore.getState().accessToken;
      if (currentToken && user) {
        setAuth({
          ...user,
          businessName: business.name,
          businessStatus: business.status,
          isPaymentLocked: business.isPaymentLocked,
          paymentLockReason: business.paymentLockReason,
          paymentAmountDue: business.paymentAmountDue,
        }, currentToken);
      }

      if (!business.isPaymentLocked && business.status === 'active') {
        toast.success('Payment verified! Your account is now active.');
        window.location.href = '/';
      } else {
        toast.error('Payment lock is still active. If you have made payment, please contact platform administration to confirm.');
      }
    } catch (err) {
      toast.error('Failed to check payment status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const amountDisplay = businessData.amountDue 
    ? Number(businessData.amountDue).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] flex items-center justify-center mb-6 shadow-[var(--shadow-sm)]">
          <CreditCard className="text-amber-600 w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
          Subscription Payment Required
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Service access is temporarily paused pending payment
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6">
          
          {/* Business & Amount Banner */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-[var(--radius-md)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {businessData.name || 'Your Business'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Payment Due
              </span>
            </div>

            {amountDisplay && (
              <div className="mt-1 pt-2 border-t border-amber-200/60 flex items-baseline justify-between">
                <span className="text-xs font-medium text-amber-800">Amount Due:</span>
                <span className="text-xl font-bold text-amber-950 font-mono">
                  KES {amountDisplay}
                </span>
              </div>
            )}

            {businessData.reason && (
              <div className="text-xs text-amber-900 mt-1 italic">
                Note: {businessData.reason}
              </div>
            )}
          </div>

          {/* Explanation */}
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed text-center">
            To continue accessing your point of sale, inventory, and sales reports, please settle your subscription payment using the details below.
          </p>

          {/* Payment Instructions */}
          <div className="bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              M-Pesa Payment Instructions
            </h4>
            
            <div className="text-xs text-[var(--color-text-secondary)] space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-muted)]">Payment Mode:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">Lipa na M-Pesa / Send Money</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-muted)]">Recipient Number:</span>
                <span className="font-bold text-[var(--color-accent)] font-mono text-sm">+254 714 731 331</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-medium text-[var(--color-text-muted)]">Reference / Account:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{businessData.name || 'Your Business Name'}</span>
              </div>
            </div>
            
            <p className="text-[11px] text-[var(--color-text-muted)] pt-1">
              After sending payment, contact platform support or click the button below to verify and instantly reactivate your service.
            </p>
          </div>

          {/* Direct Support Contact */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Need Assistance? Contact Support
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--color-text-secondary)]">
              <a 
                href="tel:+254714731331" 
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-accent)] transition-colors"
              >
                <Phone className="w-4 h-4 text-[var(--color-accent)]" />
                <span>+254 714 731 331</span>
              </a>
              <a 
                href="https://wa.me/254714731331" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] hover:text-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--color-border)] flex flex-col gap-2.5">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex justify-center items-center gap-2 h-11 px-4 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none cursor-pointer select-none transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking Status...' : 'I Have Paid / Refresh Status'}
            </button>

            <button
              onClick={logout}
              className="flex justify-center items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] focus:outline-none cursor-pointer select-none transition-colors border border-[var(--color-border)]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
