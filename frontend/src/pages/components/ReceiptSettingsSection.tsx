import React, { useState, useEffect } from 'react';
import { Receipt, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const ReceiptSettingsSection: React.FC = () => {
  const [headerless, setHeaderless] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('receipt_headerless');
    if (saved === 'true') {
      setHeaderless(true);
    }
  }, []);

  const handleToggle = (enabled: boolean) => {
    setHeaderless(enabled);
    localStorage.setItem('receipt_headerless', enabled ? 'true' : 'false');
    toast.success(enabled ? 'Headerless receipts enabled' : 'Headerless receipts disabled');
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Receipt size={22} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">Receipt Settings</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Configure how receipts are printed for your clients</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sunken)]">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Headerless Receipts</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              When enabled, receipts will not include the business name, sector, or contact details. It will start directly from the transaction details.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!headerless)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            headerless ? 'bg-[var(--color-accent)]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              headerless ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
