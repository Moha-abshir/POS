import React, { useState } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { AlertTriangle, Phone, MessageCircle, X, ChevronRight, CreditCard } from 'lucide-react';

export const PaymentWarningBanner: React.FC = () => {
  const { user } = useAuthStore();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Only display for regular tenant users when their paymentStatus is 'warning'
  const isTenant = user && user.type !== 'admin';
  const isWarningActive = isTenant && user?.paymentStatus === 'warning' && !user?.isPaymentLocked;

  if (!isWarningActive) {
    return null;
  }

  const amountDisplay = user?.paymentAmountDue 
    ? Number(user.paymentAmountDue).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <>
      {/* Brown-Yellowish Glowing/Dimming Banner */}
      <div className="bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#451a03] text-amber-50 px-4 py-2.5 shadow-lg border-b border-amber-500/50 relative z-[9998] transition-all duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          
          {/* Pulsing Alert Content */}
          <div className="flex items-center gap-2.5 animate-pulse">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-semibold text-amber-100 tracking-wide">
              Payment Reminder: Please make payment to avoid service disruption.
            </span>
            {amountDisplay && (
              <span className="hidden md:inline-flex items-center font-mono font-bold bg-amber-950/80 text-amber-200 px-2.5 py-0.5 rounded border border-amber-500/60 shadow-xs">
                Amount Due: KES {amountDisplay}
              </span>
            )}
            {user?.paymentLockReason && (
              <span className="hidden lg:inline text-amber-200/90 italic">
                ({user.paymentLockReason})
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDetailsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white border border-amber-400/50 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors cursor-pointer select-none shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>How to Pay</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Details Popup Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Subscription Payment Details
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {user?.businessName || 'Your Business'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {amountDisplay && (
              <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3 flex justify-between items-center">
                <span className="text-xs font-medium text-amber-900">Amount Due:</span>
                <span className="text-base font-bold text-amber-950 font-mono">
                  KES {amountDisplay}
                </span>
              </div>
            )}

            {user?.paymentLockReason && (
              <p className="text-xs text-[var(--color-text-secondary)] italic">
                Note: {user.paymentLockReason}
              </p>
            )}

            <div className="bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs space-y-2">
              <div className="flex justify-between items-center py-0.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Payment Mode:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">Lipa na M-Pesa / Send Money</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Number:</span>
                <span className="font-bold text-[var(--color-accent)] font-mono text-sm">+254 714 731 331</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[var(--color-text-muted)]">Reference:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{user?.businessName || 'Business Name'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
              <a 
                href="https://wa.me/254714731331" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                <span>WhatsApp Confirmation</span>
              </a>
              <a 
                href="tel:+254714731331" 
                className="flex items-center justify-center gap-1.5 px-3 h-9 rounded-[var(--radius-md)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Call</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default PaymentWarningBanner;
