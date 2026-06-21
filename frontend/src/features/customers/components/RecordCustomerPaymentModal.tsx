import React, { useState } from 'react';
import { useRecordCustomerPayment, type Customer } from '../api/customers.api';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import toast from 'react-hot-toast';

interface RecordCustomerPaymentModalProps {
  customer: Customer;
  onClose: () => void;
}

export function RecordCustomerPaymentModal({ customer, onClose }: RecordCustomerPaymentModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recordPaymentMutation = useRecordCustomerPayment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount === '' || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > Number(customer.balance)) {
      setError(`Amount cannot exceed the outstanding debt of KSH ${Number(customer.balance).toLocaleString()}`);
      return;
    }

    if (method === 'MPESA' && !mpesaReceiptNumber.trim()) {
      setError('M-Pesa reference number is required');
      return;
    }

    recordPaymentMutation.mutate({
      id: customer.id,
      amount: Number(amount),
      method,
      mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined
    }, {
      onSuccess: () => {
        toast.success('Payment recorded successfully');
        onClose();
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to record payment');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2 text-amber-700">
            <DollarSign size={20} />
            <h3 className="text-lg font-bold">Record Customer Payment</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500">Outstanding Debt:</span>
            <span className="text-lg font-bold text-[#D97706]">KSH {Number(customer.balance).toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSH</span>
              <input
                type="number"
                required
                min={0.01}
                step="any"
                max={Number(customer.balance)}
                value={amount === '' ? '' : amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-10 pl-12 pr-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <CustomSelect
              label="Select method..."
              options={[
                { id: 'CASH', name: 'Cash' },
                { id: 'MPESA', name: 'M-PESA' }
              ]}
              value={method}
              onChange={(e) => setMethod(e.target.value as 'CASH' | 'MPESA')}
              className="bg-white"
            />
          </div>

          {method === 'MPESA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                M-Pesa Reference
              </label>
              <input
                type="text"
                required
                value={mpesaReceiptNumber}
                onChange={(e) => setMpesaReceiptNumber(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
                placeholder="e.g. QWE123RTY"
                maxLength={20}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 pt-4 rounded-b-xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPaymentMutation.isPending}
              className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {recordPaymentMutation.isPending ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
