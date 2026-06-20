import React, { useState, useEffect } from 'react';
import { useCustomers } from '../../customers/api/customers.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';
import { api } from '../../../lib/api';
import { X, CreditCard, User, AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  totalAmount: number;
  discountAmount?: number;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, totalAmount, discountAmount = 0, onSuccess }) => {
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [isBusinessSale, setIsBusinessSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number | ''>(totalAmount);
  const [customerId, setCustomerId] = useState<string>('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [isStkPush, setIsStkPush] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  const { data: customersData } = useCustomers({ limit: 1000 });
  const customers = customersData?.data || [];
  const queryClient = useQueryClient();

  // Reset amount paid to total when not a credit sale
  useEffect(() => {
    if (!isCreditSale) {
      setAmountPaid(totalAmount);
    }
  }, [isCreditSale, totalAmount]);

  // Reset selected customer when flipping business toggle
  useEffect(() => {
    setCustomerId('');
  }, [isBusinessSale]);

  const createSaleMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: async (data: any) => {
      if (paymentMethod === 'MPESA' && isStkPush) {
        try {
          const res = await api.post('/mpesa/checkout/push', {
            saleId: data.data.id,
            phoneNumber: mpesaPhoneNumber,
            amount: Number(amountPaid) || 0
          });
          setCheckoutRequestId(res.data.checkoutRequestId);
          setIsPolling(true);
          toast.success('STK Push sent to customer phone. Waiting for PIN...');
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Failed to send STK push');
        }
      } else {
        toast.success('Sale completed successfully!');
        queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        // Reset state for next open
        setIsCreditSale(false);
        setIsBusinessSale(false);
        setPaymentMethod('CASH');
        setMpesaRef('');
        setMpesaPhoneNumber('');
        setIsStkPush(false);
        setIsPolling(false);
        setCheckoutRequestId(null);
        onSuccess();
        onClose();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
      setIsPolling(false);
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && checkoutRequestId) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/mpesa/checkout/status/${checkoutRequestId}`);
          if (res.data.status === 'COMPLETED') {
            clearInterval(interval);
            toast.success('M-Pesa Payment Received!');
            onSuccess();
            onClose();
          } else if (res.data.status === 'FAILED') {
            clearInterval(interval);
            toast.error(`Payment Failed: ${res.data.resultDesc}`);
            setIsPolling(false);
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPolling, checkoutRequestId, onSuccess, onClose]);

  if (!isOpen) return null;

  const paidVal = Number(amountPaid) || 0;
  // A customer MUST be selected if it's a credit sale OR if it's a business sale
  const isCustomerRequired = isCreditSale || isBusinessSale;
  const filteredCustomers = customers.filter((c: any) => 
    isBusinessSale ? c.type === 'BUSINESS' : (c.type === 'INDIVIDUAL' || !c.type)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCustomerRequired && !customerId) {
      toast.error('Customer/Business must be selected for this type of sale');
      return;
    }

    if (paymentMethod === 'MPESA' && !isStkPush && !mpesaRef && !mpesaPhoneNumber) {
      toast.error('Please provide M-Pesa reference and phone number');
      return;
    }
    
    if (paymentMethod === 'MPESA' && isStkPush && !mpesaPhoneNumber) {
      toast.error('Phone number is required for STK Push');
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
      amountPaid: (paymentMethod === 'MPESA' && isStkPush) ? 0 : paidVal,
      discountAmount,
      paymentMethod,
      mpesaRef: paymentMethod === 'MPESA' && !isStkPush ? mpesaRef : undefined,
      mpesaPhoneNumber: paymentMethod === 'MPESA' ? mpesaPhoneNumber : undefined,
      isStkPush: paymentMethod === 'MPESA' && isStkPush,
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
          {/* Smart Toggles */}
          <div className="flex gap-4">
            <label className="flex-1 flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-sm font-medium text-gray-700">Credit Sale</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isCreditSale}
                  onChange={(e) => setIsCreditSale(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97706]"></div>
              </div>
            </label>
            <label className="flex-1 flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">B2B Sale</span>
              </div>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isBusinessSale}
                  onChange={(e) => setIsBusinessSale(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97706]"></div>
              </div>
            </label>
          </div>

          {/* Total Amount Banner */}
          <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center border border-amber-100">
            <span className="text-amber-800 font-medium">Total Amount Due</span>
            <span className="text-3xl font-bold text-amber-700">KSh {totalAmount.toLocaleString()}</span>
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
                      ? 'border-[#D97706] bg-amber-50 text-amber-700' 
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
              <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 space-y-4">
                <div className="flex gap-4 mb-2 border-b border-green-200 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!isStkPush} onChange={() => setIsStkPush(false)} className="text-green-600 focus:ring-green-500" />
                    <span className="text-sm font-medium text-green-800">Manual Entry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={isStkPush} onChange={() => setIsStkPush(true)} className="text-green-600 focus:ring-green-500" />
                    <span className="text-sm font-medium text-green-800">Send STK Push (Phone Prompt)</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {!isStkPush && (
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
                  )}
                  <div className={isStkPush ? "col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number {isStkPush ? '*' : '(Optional)'}</label>
                    <input
                      type="text"
                      value={mpesaPhoneNumber}
                      onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                      placeholder="e.g. 254712345678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      required={isStkPush}
                    />
                    {isStkPush && <p className="text-xs text-green-600 mt-1">Format: 2547XXXXXXXX or 07XXXXXXXX</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Amount Paid */}
            <div className={`${!isCreditSale ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid {isCreditSale && <span className="text-[#D97706] text-xs ml-2 font-normal">(Editable for Credit)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSh</span>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={!isCreditSale}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 text-lg font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Customer Selection */}
            {isCustomerRequired && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mt-4 transition-all">
                <label className="flex items-center text-sm font-medium text-amber-900 mb-2">
                  {isBusinessSale ? <Building2 className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                  {isBusinessSale ? 'Select Business' : 'Select Customer'} 
                  <span className="text-red-500 ml-1">*Required</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required={isCustomerRequired}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white ${
                    !customerId ? 'border-red-300 focus:ring-red-500' : 'border-amber-300 focus:ring-[#D97706]'
                  }`}
                >
                  <option value="" disabled>-- Choose a {isBusinessSale ? 'Business' : 'Customer'} --</option>
                  {filteredCustomers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
                {!customerId && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {isBusinessSale ? 'A business must be attached to this sale.' : 'A customer must be attached to a credit sale.'}
                  </p>
                )}
              </div>
            )}

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
            disabled={createSaleMutation.isPending || isPolling || (isCustomerRequired && !customerId)}
            className="flex-1 px-6 py-3 bg-[#D97706] text-white rounded-xl hover:bg-amber-700 font-medium transition-colors shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPolling ? 'Waiting for PIN...' : createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};
