import React, { useState } from 'react';
import { X, Loader2, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { useProcessBankingTransaction } from '../api/banking.api';
import toast from 'react-hot-toast';

interface BankingTransactionModalProps {
  customer: any;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  onClose: () => void;
}

export const BankingTransactionModal: React.FC<BankingTransactionModalProps> = ({ customer, type, onClose }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const recordTransactionMutation = useProcessBankingTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await recordTransactionMutation.mutateAsync({
        id: customer.id,
        data: {
          type,
          amount: Number(amount),
          notes: notes.trim()
        }
      });
      toast.success(`${type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} recorded successfully`);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record transaction');
    }
  };

  const isDeposit = type === 'DEPOSIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className={`p-4 border-b flex justify-between items-center ${isDeposit ? 'bg-green-50 border-green-100 text-green-900' : 'bg-gray-100 border-gray-200 text-gray-900'}`}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {isDeposit ? <ArrowDownToLine className="w-5 h-5 text-green-600" /> : <ArrowUpFromLine className="w-5 h-5 text-gray-800" />}
            {isDeposit ? 'Deposit' : 'Withdrawal'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-md transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[var(--color-bg-sunken)] p-3 rounded-[var(--radius-md)] flex justify-between items-center text-sm border border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)]">Client Account</span>
            <span className="font-bold text-[var(--color-text-primary)]">{customer.code ? `${customer.code} - ${customer.name}` : customer.name}</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">Amount (KES)</label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--color-bg-sunken)] text-gray-700 font-semibold rounded-[var(--radius-md)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordTransactionMutation.isPending}
              style={{
                backgroundColor: isDeposit ? '#16a34a' : '#1f2937',
                color: '#ffffff',
                opacity: 1
              }}
              className="flex-1 px-4 py-2.5 font-bold rounded-[var(--radius-md)] cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {recordTransactionMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              Confirm {isDeposit ? 'Deposit' : 'Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
