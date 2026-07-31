import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { Clock, Phone, MessageCircle, LogOut, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const AwaitingApprovalPage: React.FC = () => {
  const { user, logout, setAuth } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [regDate, setRegDate] = useState<string>('');

  useEffect(() => {
    // Fetch latest details to display accurate registration date
    const fetchLatestDetails = async () => {
      try {
        const res = await api.get('/auth/me');
        const { business } = res.data.data;
        if (business?.createdAt) {
          setRegDate(new Date(business.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }));
        }
      } catch (err) {
        console.error('Failed to load business details:', err);
      }
    };
    fetchLatestDetails();
  }, []);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/auth/me');
      const { business, user: updatedUser } = res.data.data;
      
      // Update local storage auth store
      const currentToken = useAuthStore.getState().accessToken;
      if (currentToken) {
        setAuth({
          ...user!,
          businessStatus: business.status,
          isSetupComplete: business.isSetupComplete,
          businessName: business.name
        }, currentToken);
      }

      if (business.status === 'active') {
        toast.success('Congratulations! Your account has been approved.');
        window.location.href = '/';
      } else {
        toast.error(`Your account status is currently: ${business.status}`);
      }
    } catch (err) {
      toast.error('Failed to check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-[var(--color-warning-bg)] rounded-[var(--radius-lg)] flex items-center justify-center mb-6 shadow-[var(--shadow-sm)]">
          <Clock className="text-[var(--color-warning)] w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] tracking-tight">
          Awaiting Approval
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Your account is currently under review
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-8 space-y-6">
          <div className="border-b border-[var(--color-border)] pb-6">
            <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)] mb-4">
              Registration Info
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Business Name
                </dt>
                <dd className="mt-1 text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                  {user?.businessName || 'Your Store'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Submitted On
                </dt>
                <dd className="mt-1 text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                  {regDate || 'Loading...'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Current Status
                </dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-warning-bg)] text-[var(--color-warning)] capitalize">
                    {user?.businessStatus || 'pending'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-relaxed">
              Your business registration has been received and is currently under review by our platform administration team. You will gain full access to the POS terminal and dashboards once your account has been approved.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
            <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Need assistance? Contact Support
            </h4>
            <div className="grid grid-cols-1 gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              <a href="tel:+254714731331" className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors">
                <Phone className="w-4 h-4" /> +254 714 731 331
              </a>
              <a href="https://wa.me/254714731331" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors">
                <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp Support
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border)] grid grid-cols-2 gap-4">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex justify-center items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none disabled:opacity-50 cursor-pointer select-none transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              Check Status
            </button>
            <button
              onClick={logout}
              className="flex justify-center items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] focus:outline-none cursor-pointer select-none transition-colors border border-[var(--color-border)]"
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
