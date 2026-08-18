import React, { useState, useEffect, useRef } from 'react';
import { useRecordCustomerPayment, type Customer } from '../api/customers.api';
import { useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, AlertCircle, Smartphone } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { CustomerPaymentReceiptModal } from './CustomerPaymentReceiptModal';

interface RecordCustomerPaymentModalProps {
  customer: Customer;
  onClose: () => void;
}

export function RecordCustomerPaymentModal({ customer, onClose }: RecordCustomerPaymentModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [isStkPush, setIsStkPush] = useState(true);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState(customer.phone || '');
  
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [isInitiatingPush, setIsInitiatingPush] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null);
  
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const recordPaymentMutation = useRecordCustomerPayment();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = () => {
    setIsPolling(false);
    setCheckoutRequestId(null);
    setIsInitiatingPush(false);
    onCloseRef.current();
  };

  // ── 1. Local Webhook Poller ──────────────────────────────────
  useEffect(() => {
    let localPollTimer: ReturnType<typeof setTimeout>;
    
    const pollLocalSession = async () => {
      if (!isPolling || !checkoutRequestId) return;
      
      try {
        const res = await api.get(`/mpesa/checkout/status/${checkoutRequestId}`);
        if (res.data.status === 'COMPLETED') {
          toast.success('M-Pesa Payment Received!');
          setIsPolling(false);
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'payments'] });
          queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'purchases'] });
          queryClient.refetchQueries({ queryKey: ['customers', customer.id, 'payments'] });
          queryClient.refetchQueries({ queryKey: ['customers'] });
          handleClose();
          return;
        } else if (res.data.status === 'FAILED') {
          toast.error(`Payment Failed: ${res.data.resultDesc}`);
          setIsPolling(false);
          return;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error('Payment failed or was cancelled.');
          setIsPolling(false);
          return;
        }
      }
      
      if (isPolling) {
        localPollTimer = setTimeout(pollLocalSession, 3000);
      }
    };

    if (isPolling && checkoutRequestId) {
      localPollTimer = setTimeout(pollLocalSession, 3000);
    }
    
    return () => clearTimeout(localPollTimer);
  }, [isPolling, checkoutRequestId, customer.id, queryClient]);

  // ── 2. Slow Safaricom Query Fallback ──────────────────────────────────
  useEffect(() => {
    let safaricomQueryTimer: ReturnType<typeof setTimeout>;
    
    const triggerSafaricomQuery = async () => {
      if (!isPolling || !checkoutRequestId) return;
      
      try {
        const res = await api.post(`/mpesa/checkout/query/${checkoutRequestId}`);
        if (res.data.status === 'FAILED') {
          toast.error(`Payment Failed: ${res.data.resultDesc}`);
          setIsPolling(false);
          return;
        } else if (res.data.status === 'COMPLETED') {
          toast.success('M-Pesa Payment Received via Query Fallback!');
          setIsPolling(false);
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'payments'] });
          queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'purchases'] });
          queryClient.refetchQueries({ queryKey: ['customers', customer.id, 'payments'] });
          queryClient.refetchQueries({ queryKey: ['customers'] });
          handleClose();
          return;
        }
      } catch (err: any) {
        console.warn('Safaricom query error', err);
        if (err.response?.status === 404) {
          toast.error('Payment failed or was cancelled.');
          setIsPolling(false);
          return;
        }
      }
      
      if (isPolling) {
        safaricomQueryTimer = setTimeout(triggerSafaricomQuery, 15000);
      }
    };

    if (isPolling && checkoutRequestId) {
      safaricomQueryTimer = setTimeout(triggerSafaricomQuery, 20000);
    }
    
    return () => clearTimeout(safaricomQueryTimer);
  }, [isPolling, checkoutRequestId, customer.id, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (method === 'MPESA') {
      if (isStkPush) {
        if (!mpesaPhoneNumber.trim()) {
          setError('Phone number is required for STK Push');
          return;
        }
        
        setIsInitiatingPush(true);
        try {
          const res = await api.post('/mpesa/checkout/push', {
            customerId: customer.id,
            phoneNumber: mpesaPhoneNumber.trim(),
            amount: Number(amount)
          });
          setCheckoutRequestId(res.data.checkoutRequestId);
          setIsPolling(true);
          toast.success('STK Push sent to customer phone. Waiting for PIN...');
        } catch (e: any) {
          setError(e.response?.data?.message || 'Failed to send STK push');
        } finally {
          setIsInitiatingPush(false);
        }
        return;
      } else {
        if (!mpesaReceiptNumber.trim()) {
          setError('M-Pesa reference number is required');
          return;
        }
      }
    }

    // Cash or Manual M-Pesa Flow
    recordPaymentMutation.mutate({
      id: customer.id,
      amount: Number(amount),
      method,
      mpesaReceiptNumber: method === 'MPESA' ? mpesaReceiptNumber.trim() : undefined
    }, {
      onSuccess: (res: any) => {
        toast.success('Payment recorded successfully');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'payments'] });
        queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'purchases'] });
        queryClient.refetchQueries({ queryKey: ['customers', customer.id, 'payments'] });
        queryClient.refetchQueries({ queryKey: ['customers'] });
        const payload = res.data || res;
        setPaymentReceiptData({
          payment: payload.payment,
          customer: payload.customer || customer,
          previousBalance: payload.previousBalance ?? Number(customer.balance),
          amountPaid: payload.amountPaid ?? Number(amount),
          newBalance: payload.newBalance ?? (Number(customer.balance) - Number(amount))
        });
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to record payment');
      }
    });
  };

  // ── Render 3: Waiting for PIN State (Premium Redesigned View) ──────────────────
  if (isPolling) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4 transition-all duration-300">
        <style>{`
          @keyframes bubble-morph {
            0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            50% { border-radius: 30% 60% 70% 30% / 50% 60% 30% 70%; }
            100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          }
          @keyframes ripple-ring {
            0% { transform: scale(0.7); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes float-soft {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes progress-loading {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .custom-glass {
            background: rgba(28, 31, 36, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .morphing-bubble {
            animation: bubble-morph 8s ease-in-out infinite, float-soft 4s ease-in-out infinite;
          }
          .ripple-ring-1 {
            animation: ripple-ring 3s infinite cubic-bezier(0.36, 0.07, 0.19, 0.97);
          }
          .ripple-ring-2 {
            animation: ripple-ring 3s infinite cubic-bezier(0.36, 0.07, 0.19, 0.97);
            animation-delay: 1s;
          }
          .ripple-ring-3 {
            animation: ripple-ring 3s infinite cubic-bezier(0.36, 0.07, 0.19, 0.97);
            animation-delay: 2s;
          }
          .progress-anim {
            animation: progress-loading 60s linear forwards;
          }
        `}</style>
        
        <div className="custom-glass rounded-3xl w-full max-w-md overflow-hidden p-8 flex flex-col items-center relative text-white border border-white/10">
          {/* Header */}
          <div className="w-full flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Secure Payment Gateway</span>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Animated Bubble Area */}
          <div className="relative w-48 h-48 flex justify-center items-center mb-8">
            {/* Ripples */}
            <div className="absolute inset-0 rounded-full border border-amber-500/20 ripple-ring-1"></div>
            <div className="absolute inset-0 rounded-full border border-amber-500/20 ripple-ring-2"></div>
            <div className="absolute inset-0 rounded-full border border-amber-500/20 ripple-ring-3"></div>
            
            {/* Morphing Bubble */}
            <div className="w-28 h-28 bg-gradient-to-tr from-[#D97706] to-[#F59E0B] rounded-[50%] morphing-bubble flex flex-col justify-center items-center shadow-xl shadow-amber-950/40 border border-white/10">
              <Smartphone className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center space-y-4 mb-8 w-full">
            <h3 className="text-xl font-bold tracking-wide">Waiting for PIN</h3>
            <p className="text-sm text-white/70 max-w-xs mx-auto leading-relaxed">
              We've pushed a payment prompt to <span className="font-semibold text-amber-400">{mpesaPhoneNumber}</span>. Please enter your M-Pesa PIN on your mobile phone to authorize the transaction.
            </p>
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 inline-flex justify-between items-center w-full max-w-xs mx-auto">
              <span className="text-xs text-white/50">Total Amount Due</span>
              <span className="text-base font-bold text-amber-400">KSh {Number(amount).toLocaleString()}</span>
            </div>
          </div>

          {/* Progress bar loader */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full progress-anim"></div>
          </div>

          {/* Action */}
          <button 
            onClick={handleClose}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-red-400 rounded-xl font-medium transition-all text-sm cursor-pointer"
          >
            Cancel Transaction
          </button>
        </div>
      </div>
    );
  }

  // ── Render 2: Initiating Push Loading Screen ──────────────────────────────────
  if (isInitiatingPush) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4 transition-all duration-300">
        <style>{`
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner-accent {
            border-top-color: #D97706;
            border-right-color: transparent;
            border-bottom-color: #F59E0B;
            border-left-color: transparent;
          }
        `}</style>
        <div className="bg-[#1C1F24] rounded-3xl w-full max-w-sm p-8 flex flex-col items-center text-white border border-white/10 shadow-2xl">
          <div className="w-16 h-16 border-4 rounded-full spinner-accent animate-[spin-slow_1.5s_linear_infinite] mb-6"></div>
          <h3 className="text-lg font-bold mb-2">Initiating M-Pesa STK Push</h3>
          <p className="text-sm text-white/60 text-center leading-relaxed">
            Please wait while we request the payment prompt for phone <span className="font-semibold text-amber-400">{mpesaPhoneNumber}</span>...
          </p>
        </div>
      </div>
    );
  }

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
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={isStkPush}
                    onChange={() => setIsStkPush(true)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium">M-PESA STK Push</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isStkPush}
                    onChange={() => setIsStkPush(false)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium">Manual Reference</span>
                </label>
              </div>

              {isStkPush ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number for STK Push
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Smartphone size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={mpesaPhoneNumber}
                      onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
                    />
                  </div>
                </div>
              ) : (
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
                    maxLength={20}
                  />
                </div>
              )}
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
              disabled={recordPaymentMutation.isPending || isInitiatingPush || isPolling}
              className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {recordPaymentMutation.isPending || isInitiatingPush ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>

      <CustomerPaymentReceiptModal
        isOpen={!!paymentReceiptData}
        onClose={() => {
          setPaymentReceiptData(null);
          handleClose();
        }}
        paymentData={paymentReceiptData}
      />
    </div>
  );
}
