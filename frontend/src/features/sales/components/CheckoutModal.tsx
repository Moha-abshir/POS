import React, { useState, useEffect, useRef } from 'react';
import { useCustomers } from '../../customers/api/customers.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';
import { api } from '../../../lib/api';
import { X, CreditCard, User, AlertCircle, Building2, Smartphone, ArrowRight } from 'lucide-react';
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
  const [isInitiatingPush, setIsInitiatingPush] = useState(false);

  const { data: customersData } = useCustomers({ limit: 1000 });
  const customers = customersData?.data || [];
  const queryClient = useQueryClient();

  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  }, [onSuccess, onClose]);

  const handleClose = () => {
    setIsCreditSale(false);
    setIsBusinessSale(false);
    setPaymentMethod('CASH');
    setAmountPaid(totalAmount);
    setCustomerId('');
    setMpesaRef('');
    setMpesaPhoneNumber('');
    setIsStkPush(false);
    setIsPolling(false);
    setCheckoutRequestId(null);
    setIsInitiatingPush(false);
    onCloseRef.current();
  };

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
        setIsInitiatingPush(true);
        try {
          const res = await api.post('/mpesa/checkout/push', {
            saleId: data.id,
            phoneNumber: mpesaPhoneNumber,
            amount: Number(amountPaid) || 0
          });
          setCheckoutRequestId(res.data.checkoutRequestId);
          setIsPolling(true);
          toast.success('STK Push sent to customer phone. Waiting for PIN...');
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Failed to send STK push');
          // Backend already rolled back the sale — refresh the UI to reflect it
          queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
        } finally {
          setIsInitiatingPush(false);
        }
      } else {
        toast.success('Sale completed successfully!');
        queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        handleClose();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete sale');
      setIsPolling(false);
      setIsInitiatingPush(false);
    }
  });

  // ── 1. Local Webhook Poller ──────────────────────────────────
  // Checks our DB every 3s. DB is updated by Safaricom's webhook callback instantly.
  useEffect(() => {
    let localPollTimer: ReturnType<typeof setTimeout>;
    
    const pollLocalSession = async () => {
      if (!isPolling || !checkoutRequestId) return;
      
      try {
        const res = await api.get(`/mpesa/checkout/status/${checkoutRequestId}`);
        if (res.data.status === 'COMPLETED') {
          toast.success('M-Pesa Payment Received!');
          setIsPolling(false);
          onSuccessRef.current();
          handleClose();
          return;
        } else if (res.data.status === 'FAILED') {
          toast.error(`Payment Failed: ${res.data.resultDesc}`);
          setIsPolling(false);
          return;
        }
      } catch (err: any) {
        // If the transaction is not found (404), it has been rolled back due to failure
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
  }, [isPolling, checkoutRequestId]);

  // ── 2. Slow Safaricom Query Fallback ──────────────────────────────────
  // Asks Safaricom directly what happened. Runs every 15s. First run delayed 20s.
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
          onSuccessRef.current();
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
  }, [isPolling, checkoutRequestId]);

  if (!isOpen) return null;

  const paidVal = Number(amountPaid) || 0;
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
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-400">Secure Payment Gateway</span>
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
            <div className="absolute inset-0 rounded-full border border-green-500/20 ripple-ring-1"></div>
            <div className="absolute inset-0 rounded-full border border-green-500/20 ripple-ring-2"></div>
            <div className="absolute inset-0 rounded-full border border-green-500/20 ripple-ring-3"></div>
            
            {/* Morphing Bubble */}
            <div className="w-28 h-28 bg-gradient-to-tr from-[#16A34A] to-[#D97706] rounded-[50%] morphing-bubble flex flex-col justify-center items-center shadow-xl shadow-green-950/40 border border-white/10">
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
              <span className="text-base font-bold text-amber-400">KSh {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Progress bar loader */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-green-500 to-amber-500 h-full rounded-full progress-anim"></div>
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
            border-bottom-color: #16A34A;
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

  // ── Render 1: Main Checkout Form Redesign ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex justify-center items-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#F7F6F4]/60">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Checkout</h2>
            <p className="text-sm text-gray-500">Choose payment method & finalize order</p>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          
          {/* Credit & B2B Toggles */}
          <div className="flex gap-4">
            <label className="flex-1 flex items-center justify-between p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
              <span className="text-sm font-semibold text-gray-700">Credit Sale</span>
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
            <label className="flex-1 flex items-center justify-between p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">B2B Sale</span>
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

          {/* Total Amount Banner (Beautiful Premium Gradient matching Amber brand) */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-2xl p-5 flex justify-between items-center border border-amber-200/60 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Amount Due</span>
              {discountAmount > 0 && (
                <p className="text-xs text-amber-700/70">
                  Discount applied: KSh {discountAmount.toLocaleString()}
                </p>
              )}
            </div>
            <span className="text-3xl font-extrabold text-[#D97706] tracking-tight">KSh {totalAmount.toLocaleString()}</span>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Payment Method Selector */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all shadow-sm ${
                    paymentMethod === 'CASH' 
                      ? 'border-[#D97706] bg-amber-50/50 text-[#D97706]' 
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="font-semibold text-sm">Cash Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MPESA')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all shadow-sm ${
                    paymentMethod === 'MPESA' 
                      ? 'border-green-600 bg-green-50/40 text-green-700' 
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="font-semibold text-sm">M-Pesa Mobile</span>
                </button>
              </div>
            </div>

            {/* M-Pesa Settings View */}
            {paymentMethod === 'MPESA' && (
              <div className="p-5 bg-green-50/40 rounded-2xl border border-green-200/50 space-y-4 shadow-inner">
                <div className="flex gap-5 mb-2 border-b border-green-200 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="mpesaType" 
                      checked={!isStkPush} 
                      onChange={() => setIsStkPush(false)} 
                      className="text-green-600 focus:ring-green-500 h-4 w-4" 
                    />
                    <span className="text-sm font-semibold text-green-800">Manual Reference Entry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="mpesaType" 
                      checked={isStkPush} 
                      onChange={() => setIsStkPush(true)} 
                      className="text-green-600 focus:ring-green-500 h-4 w-4" 
                    />
                    <span className="text-sm font-semibold text-green-800">Send STK Push Request</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {!isStkPush && (
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">M-Pesa Ref (Optional)</label>
                      <input
                        type="text"
                        value={mpesaRef}
                        onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                        placeholder="e.g. SGT8WQ12A"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none transition-all shadow-sm text-sm"
                      />
                    </div>
                  )}
                  <div className={isStkPush ? "col-span-2" : "col-span-1"}>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Phone Number {isStkPush ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      value={mpesaPhoneNumber}
                      onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                      placeholder="e.g. 254712345678"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none transition-all shadow-sm text-sm"
                      required={isStkPush}
                    />
                    {isStkPush && <p className="text-xs text-green-700 mt-1.5 font-medium">Format: 2547XXXXXXXX or 07XXXXXXXX</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Amount Paid Field */}
            <div className={`${!isCreditSale ? 'opacity-65 cursor-not-allowed' : ''}`}>
              <label className="block text-sm font-bold text-gray-800 mb-1.5 uppercase tracking-wider">
                Amount Paid {isCreditSale && <span className="text-[#D97706] text-xs font-semibold ml-2">(Editable for Credit)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">KSh</span>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={!isCreditSale}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3.5 text-lg font-bold border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none disabled:bg-[#F7F6F4]/80 disabled:text-gray-500 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Customer Dropdown */}
            {isCustomerRequired && (
              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/50 mt-4 shadow-sm transition-all">
                <label className="flex items-center text-sm font-bold text-amber-900 mb-2 uppercase tracking-wider">
                  {isBusinessSale ? <Building2 className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                  {isBusinessSale ? 'Select Business' : 'Select Customer'} 
                  <span className="text-red-500 ml-1.5 font-semibold text-xs">*Required</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required={isCustomerRequired}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white transition-all shadow-sm text-sm ${
                    !customerId ? 'border-red-300 focus:ring-red-500' : 'border-amber-300 focus:ring-[#D97706]'
                  }`}
                >
                  <option value="" disabled>-- Choose a {isBusinessSale ? 'Business' : 'Customer'} --</option>
                  {filteredCustomers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
                {!customerId && (
                  <p className="mt-2 text-xs text-red-600 flex items-center font-medium">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    {isBusinessSale ? 'A business must be attached to this sale.' : 'A customer must be attached to a credit sale.'}
                  </p>
                )}
              </div>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-[#F7F6F4]/60 flex gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            form="checkout-form"
            type="submit"
            disabled={createSaleMutation.isPending || isPolling || isInitiatingPush || (isCustomerRequired && !customerId)}
            className="flex-1 px-6 py-3.5 bg-[#D97706] hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-amber-600/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 cursor-pointer"
          >
            {createSaleMutation.isPending ? 'Processing...' : (
              <>
                Complete Sale
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
