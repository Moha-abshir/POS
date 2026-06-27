import React from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { XCircle, Mail, LogOut } from 'lucide-react';

export const AccountRejectedPage: React.FC = () => {
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-[var(--color-danger-bg)] rounded-[var(--radius-lg)] flex items-center justify-center mb-6 shadow-[var(--shadow-sm)]">
          <XCircle className="text-[var(--color-danger)] w-8 h-8" />
        </div>
        <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] tracking-tight">
          Registration Rejected
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Application was not approved
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-relaxed text-center">
              Your business registration request was reviewed by our platform administration team and was not approved.
            </p>
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-relaxed text-center">
              If you believe this is in error, or if you wish to appeal the decision, please reach out to support.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
            <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Contact Support
            </h4>
            <div className="grid grid-cols-1 gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              <a href="mailto:support@yourpos.com" className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors">
                <Mail className="w-4 h-4" /> support@yourpos.com
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border)] flex justify-center">
            <button
              onClick={logout}
              className="flex justify-center items-center gap-2 h-10 px-6 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] focus:outline-none cursor-pointer select-none transition-colors border border-[var(--color-border)] w-full"
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
