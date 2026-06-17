import React, { useState } from 'react';
import { useCustomers } from '../../customers/api/customers.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';
import { X, CreditCard, User, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  totalAmount: number;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, totalAmount, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number | ''>(totalAmount);
  const [customerId, setCustomerId] = useState<string>('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');

  const { data: customersData } = useCustomers({ limit: 100 });
  const customers = customersData?.data || [];
  const queryClient = useQueryClient();

  const createSaleMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      toast.success('Sale completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    }
  });

  if (!isOpen) return null;

  const paidVal = Number(amountPaid) || 0;
  const isCreditSale = paidVal < totalAmount;
  const isCustomerRequired = isCreditSale;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCustomerRequired && !customerId) {
      toast.error('Customer must be selected for partial/credit sales');
      return;
    }

    if (paymentMethod === 'MPESA' && !mpesaRef && !mpesaPhoneNumber) {
      toast.error('Please provide M-Pesa reference or phone number');
      return;
    }

    createSaleMutation.mutate({
      customerId: customerId || undefined,
      items: cart.map(item => ({
        variantId: item.variantId,
        unitId: item.unitId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      })),
      amountPaid: paidVal,
      paymentMethod,
      mpesaRef: paymentMethod === 'MPESA' ? mpesaRef : undefined,
      mpesaPhoneNumber: paymentMethod === 'MPESA' ? mpesaPhoneNumber : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
            <p className="text-sm text-gray-500">Complete the transaction</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {/* Total Amount Banner */}
          <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center border border-indigo-100">
            <span className="text-indigo-800 font-medium">Total Amount Due</span>
            <span className="text-3xl font-bold text-indigo-700">KSh {totalAmount.toLocaleString()}</span>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'CASH' 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="font-medium">Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MPESA')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'MPESA' 
                      ? 'border-green-600 bg-green-50 text-green-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="font-medium">M-Pesa</span>
                </button>
              </div>
            </div>

            {/* M-Pesa Details */}
            {paymentMethod === 'MPESA' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Ref (Optional)</label>
                  <input
                    type="text"
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                    placeholder="e.g. SGT8WQ12A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={mpesaPhoneNumber}
                    onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                    placeholder="e.g. 07..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}

            {/* Amount Paid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSh</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 text-lg font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                Customer {isCustomerRequired ? <span className="text-red-500 ml-1">*Required for Credit</span> : <span className="text-gray-400 ml-1">(Optional)</span>}
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required={isCustomerRequired}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white ${
                  isCustomerRequired && !customerId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                }`}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
              {isCustomerRequired && !customerId && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Amount paid is less than total. Customer is required.
                </p>
              )}
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            form="checkout-form"
            type="submit"
            disabled={createSaleMutation.isPending || (isCustomerRequired && !customerId)}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};
