import React, { useState, useEffect, useRef } from 'react';
import { useRecordEmployeePayout, useSettleEmployeeSalary, useRecordEmployeeDeposit, type Customer } from '../api/customers.api';
import { useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import toast from 'react-hot-toast';
import { EmployeeTransactionReceiptModal, type EmployeeReceiptData } from './EmployeeTransactionReceiptModal';

interface EmployeeFinancialModalProps {
  customer: Customer;
  onClose: () => void;
}

export function EmployeeFinancialModal({ customer, onClose }: EmployeeFinancialModalProps) {
  const [activeTab, setActiveTab] = useState<'SETTLEMENT' | 'ADVANCE' | 'DEPOSIT'>('SETTLEMENT');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptData, setReceiptData] = useState<EmployeeReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const payoutMutation = useRecordEmployeePayout();
  const settlementMutation = useSettleEmployeeSalary();
  const depositMutation = useRecordEmployeeDeposit();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const baseSalary = Number(customer.baseSalary || 0);
  const additionalSavings = Number(customer.additionalSavings || 0);
  const deductions = Number(customer.balance || 0);
  const rawNet = -( (baseSalary + additionalSavings) - deductions );
  const netSalary = Math.round(rawNet * 100) / 100;
  const netPayable = Math.max(0, (baseSalary + additionalSavings) - deductions);

  // Set default amount when switching tabs
  useEffect(() => {
    if (activeTab === 'SETTLEMENT') {
      setAmount(netPayable > 0 ? netPayable : '');
    } else {
      setAmount('');
    }
  }, [activeTab, netPayable]);

  const handleClose = () => {
    onCloseRef.current();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount) || 0;

    if (activeTab !== 'SETTLEMENT' && numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (method === 'MPESA' && numericAmount > 0 && !mpesaReceiptNumber.trim()) {
      setError('M-Pesa transaction reference number is required');
      return;
    }

    try {
      if (activeTab === 'SETTLEMENT') {
        const res = await settlementMutation.mutateAsync({
          id: customer.id,
          amount: numericAmount,
          method,
          mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined,
          notes: notes.trim() || 'Full Salary Settlement & Pay Cycle Close'
        });

        toast.success('Salary settled and pay cycle closed successfully');
        setReceiptData({
          type: 'SETTLEMENT',
          payment: res.data.payment,
          customer: res.data.customer,
          previousBalance: res.data.previousBalance,
          amountPaid: numericAmount,
          newBalance: res.data.newBalance
        });
      } else if (activeTab === 'ADVANCE') {
        const res = await payoutMutation.mutateAsync({
          id: customer.id,
          amount: numericAmount,
          method,
          mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined,
          notes: notes.trim() || 'Salary Advance'
        });

        toast.success('Salary advance recorded successfully');
        setReceiptData({
          type: 'PAYOUT',
          payment: res.data.payment,
          customer: res.data.customer,
          previousBalance: res.data.previousBalance,
          amountPaid: numericAmount,
          newBalance: res.data.newBalance
        });
      } else {
        const res = await depositMutation.mutateAsync({
          id: customer.id,
          amount: numericAmount,
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
          amountPaid: numericAmount,
          newBalance: res.data.newBalance
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Transaction failed');
    }
  };

  const isPending = payoutMutation.isPending || settlementMutation.isPending || depositMutation.isPending;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Employee Operations</h3>
              <p className="text-xs text-gray-500 font-medium">{customer.name} (Employee)</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 bg-gray-50/80 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('SETTLEMENT'); setError(null); }}
              className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer text-center ${
                activeTab === 'SETTLEMENT'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Settle & Close Cycle
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('ADVANCE'); setError(null); }}
              className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer text-center ${
                activeTab === 'ADVANCE'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Salary Advance
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('DEPOSIT'); setError(null); }}
              className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer text-center ${
                activeTab === 'DEPOSIT'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Add Savings
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
                <span>Personal Savings:</span>
                <span>KSh {additionalSavings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Goods Taken:</span>
                <span>KSh {deductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-extrabold text-sm">
                <span className="text-gray-900">Net Salary Payable:</span>
                {(() => {
                  if (netSalary === 0 || Object.is(netSalary, -0)) {
                    return <span className="text-gray-900 font-extrabold">KSh 0.00</span>;
                  }
                  if (netSalary < 0) {
                    return <span className="text-red-600 font-extrabold">- KSh {Math.abs(netSalary).toLocaleString()}</span>;
                  }
                  return <span className="text-amber-700 font-extrabold">+ KSh {netSalary.toLocaleString()} (Owed)</span>;
                })()}
              </div>
            </div>

            {activeTab === 'SETTLEMENT' && (
              <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200/60 leading-relaxed">
                <p className="font-semibold mb-0.5">Full Salary Settlement:</p>
                <p className="text-[11px] text-emerald-800">
                  Pays remaining net salary, settles all goods taken in this pay period, and starts a clean cycle.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {activeTab === 'SETTLEMENT' ? 'Settlement Payout (KSH)' : (activeTab === 'ADVANCE' ? 'Advance Amount (KSH)' : 'Deposit Amount (KSH)')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <span className="text-xs font-bold">KSh</span>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setAmount(val);
                  }}
                  placeholder={activeTab === 'SETTLEMENT' ? 'Enter settlement payout amount' : 'Enter amount'}
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm font-semibold"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <CustomSelect
                label="Select method..."
                options={[
                  { id: 'CASH', name: 'Cash' },
                  { id: 'MPESA', name: 'M-PESA' },
                ]}
                value={method}
                onChange={(e) => setMethod(e.target.value as 'CASH' | 'MPESA')}
                disabled={isPending}
              />
            </div>

            {/* M-PESA Reference input */}
            {method === 'MPESA' && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    M-Pesa Transaction Ref / Receipt No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mpesaReceiptNumber}
                    onChange={(e) => setMpesaReceiptNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. QBH7894561"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm uppercase font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    disabled={isPending}
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
                placeholder={
                  activeTab === 'SETTLEMENT' 
                    ? 'e.g. End month salary settlement' 
                    : (activeTab === 'ADVANCE' ? 'e.g. Mid-month salary advance' : 'e.g. Personal savings for safekeeping')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-black focus:border-black"
                disabled={isPending}
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl text-sm transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                  activeTab === 'SETTLEMENT' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : (activeTab === 'ADVANCE' ? 'bg-black hover:bg-neutral-800' : 'bg-blue-600 hover:bg-blue-700')
                }`}
              >
                {isPending 
                  ? 'Processing...' 
                  : (activeTab === 'SETTLEMENT' ? 'Settle & Close Cycle' : (activeTab === 'ADVANCE' ? 'Confirm Advance' : 'Confirm Deposit'))
                }
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
