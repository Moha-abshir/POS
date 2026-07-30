import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateBankingCustomer } from '../api/banking.api';

interface BankingCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'BANKER' | 'LOAN_CLIENT';
}

export const BankingCustomerModal: React.FC<BankingCustomerModalProps> = ({ isOpen, onClose, type }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: createCustomer, isPending } = useCreateBankingCustomer();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createCustomer({ name, phone, type });
      setName('');
      setPhone('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[var(--radius-lg)] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {type === 'BANKER' ? 'New Banker' : 'New Loan Client'}
          </h2>
          <button 
            onClick={onClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded-full hover:bg-[var(--color-bg-sunken)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-sm rounded-[var(--radius-md)] border border-[var(--color-danger)]/20">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold rounded-[var(--radius-md)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name}
              className="flex-1 px-4 py-2.5 bg-black text-white font-semibold rounded-[var(--radius-md)] hover:bg-gray-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
