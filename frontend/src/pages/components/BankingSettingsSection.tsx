import React, { useState } from 'react';
import { useAuthStore } from '../../features/auth/stores/auth.store';
import { useEnableBanking } from '../../features/settings/api/businesses.api';
import { Landmark, Loader2, AlertTriangle } from 'lucide-react';

export const BankingSettingsSection: React.FC = () => {
  const { user, setAuth, accessToken } = useAuthStore();
  const enableBankingMutation = useEnableBanking();
  const [showConfirm, setShowConfirm] = useState(false);

  // If already enabled, just show it's enabled
  if (user?.isBankingEnabled) {
    return (
      <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-[var(--radius-md)] shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-semibold mb-1 text-[var(--color-text-primary)]">
              Banking & Customer Ledger
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              This feature is enabled and active. You can track customer debts, loans, deposits, and M-PESA float directly from the Banking page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleEnable = async () => {
    try {
      await enableBankingMutation.mutateAsync();
      // Update local state
      if (user && accessToken) {
        setAuth({ ...user, isBankingEnabled: true }, accessToken);
      }
    } catch (error) {
      console.error('Failed to enable banking', error);
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] rounded-[var(--radius-md)] shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold mb-1 text-[var(--color-text-primary)]">
              Banking & Customer Ledger
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Enable the banking module to track customer float, loans, deposits, and comprehensive debt ledgers.
            </p>
          </div>
        </div>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="shrink-0 px-4 py-2 bg-black text-white hover:bg-gray-800 font-semibold rounded-[var(--radius-md)] transition-colors select-none"
          >
            Enable Banking
          </button>
        ) : (
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] font-semibold rounded-[var(--radius-md)] transition-colors select-none"
            >
              Cancel
            </button>
            <button
              onClick={handleEnable}
              disabled={enableBankingMutation.isPending}
              className="px-4 py-2 bg-[var(--color-danger)] hover:bg-red-600 text-white font-semibold rounded-[var(--radius-md)] transition-colors select-none flex items-center justify-center min-w-[120px]"
            >
              {enableBankingMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Enable'}
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-[var(--radius-md)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">Permanent Action</p>
            <p>Once enabled, the Banking feature cannot be turned off. Ensure you want to enable this module for your business.</p>
          </div>
        </div>
      )}
    </div>
  );
};
