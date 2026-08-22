import React, { useState, useEffect, useRef } from 'react';
import { useRecordEmployeePayout, useRecordEmployeeDeposit, type Customer } from '../api/customers.api';
import { useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, PiggyBank, HandCoins, AlertCircle, Smartphone } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { EmployeeTransactionReceiptModal, type EmployeeReceiptData } from './EmployeeTransactionReceiptModal';

interface EmployeeFinancialModalProps {
  customer: Customer;
  onClose: () => void;
}

export function EmployeeFinancialModal({ customer, onClose }: EmployeeFinancialModalProps) {
  const [activeTab, setActiveTab] = useState<'PAYOUT' | 'DEPOSIT'>('PAYOUT');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isStkPush, setIsStkPush] = useState(true);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState(customer.phone || '');
  
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [isInitiatingPush, setIsInitiatingPush] = useState(false);
  const [receiptData, setReceiptData] = useState<EmployeeReceiptData | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const payoutMutation = useRecordEmployeePayout();
  const depositMutation = useRecordEmployeeDeposit();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const baseSalary = Number(customer.baseSalary || 0);
  const additionalSavings = Number(customer.additionalSavings || 0);
  const deductions = Number(customer.balance || 0);
  const netSalary = -( (baseSalary + additionalSavings) - deductions );

  const handleClose = () => {
    setIsPolling(false);
    setCheckoutRequestId(null);
    setIsInitiatingPush(false);
    onCloseRef.current();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (method === 'MPESA' && !isStkPush && !mpesaReceiptNumber.trim()) {
      setError('Please enter the M-Pesa transaction reference number');
      return;
    }

    try {
      if (activeTab === 'PAYOUT') {
        const res = await payoutMutation.mutateAsync({
          id: customer.id,
          amount: Number(amount),
          method,
          mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined,
          notes: notes.trim() || 'Salary Payout / Advance'
        });

        toast.success('Salary payout recorded successfully');
        setReceiptData({
          type: 'PAYOUT',
          payment: res.data.payment,
          customer: res.data.customer,
          previousBalance: res.data.previousBalance,
          amountPaid: Number(amount),
          newBalance: res.data.newBalance
        });
      } else {
        const res = await depositMutation.mutateAsync({
          id: customer.id,
          amount: Number(amount),
          method,
          mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined,
          notes: notes.trim() || 'Personal Savings Deposit'
        });

        toast.success('Employee savings deposit recorded successfully');
        setReceiptData({
          type: 'DEPOSIT',
          payment: res.data.payment,
          customer: res.data.customer,
          previousBalance: res.data.previousBalance,
          amountPaid: Number(amount),
          newBalance: res.data.newBalance
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Transaction failed');
    }
  };

  const isPending = payoutMutation.isPending || depositMutation.isPending || isInitiatingPush;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                {activeTab === 'PAYOUT' ? <HandCoins className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Employee Operations</h3>
                <p className="text-xs text-gray-500 font-medium">{customer.name} (Employee)</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending || isPolling}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 bg-gray-50/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveTab('PAYOUT'); setError(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'PAYOUT'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <HandCoins className="w-4 h-4 text-emerald-600" />
              Pay Salary / Advance
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('DEPOSIT'); setError(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'DEPOSIT'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <PiggyBank className="w-4 h-4 text-blue-600" />
              Add Savings / Deposit
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Live Financial Breakdown Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Monthly Base Salary:</span>
                <span className="font-semibold text-gray-900">KSh {baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-blue-700 font-medium">
                <span>Personal Savings Deposited:</span>
                <span>KSh {additionalSavings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Goods Taken / Deductions:</span>
                <span>KSh {deductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-extrabold text-sm">
                <span className="text-gray-900">Net Salary Payable (Money Out):</span>
                <span className={netSalary < 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {netSalary < 0 ? `- KSh ${Math.abs(netSalary).toLocaleString()}` : `+ KSh ${netSalary.toLocaleString()} (Owed)`}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {activeTab === 'PAYOUT' ? 'Payout Amount (KSH)' : 'Deposit Amount (KSH)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <span className="text-xs font-bold">KSh</span>
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setAmount(val);
                  }}
                  placeholder={activeTab === 'PAYOUT' ? 'Enter salary payout amount' : 'Enter deposit amount'}
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm font-semibold"
                  disabled={isPending || isPolling}
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <CustomSelect
                value={method}
                onChange={(val) => setMethod(val as any)}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'MPESA', label: 'M-PESA' },
                ]}
                disabled={isPending || isPolling}
              />
            </div>

            {/* M-PESA Reference / Phone input */}
            {method === 'MPESA' && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    M-Pesa Transaction Ref / Receipt No.
                  </label>
                  <input
                    type="text"
                    required
                    value={mpesaReceiptNumber}
                    onChange={(e) => setMpesaReceiptNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. QBH7894561"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm uppercase font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    disabled={isPending || isPolling}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={activeTab === 'PAYOUT' ? 'e.g. End month salary balance payout' : 'e.g. Personal savings for safekeeping'}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-black focus:border-black"
                disabled={isPending || isPolling}
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending || isPolling}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isPolling || !amount || amount <= 0}
                className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl text-sm transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                  activeTab === 'PAYOUT' ? 'bg-black hover:bg-neutral-800' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPending ? 'Processing...' : (activeTab === 'PAYOUT' ? 'Confirm Payout' : 'Confirm Deposit')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {receiptData && (
        <EmployeeTransactionReceiptModal
          isOpen={!!receiptData}
          onClose={() => {
            setReceiptData(null);
            handleClose();
          }}
          receiptData={receiptData}
        />
      )}
    </>
  );
}
