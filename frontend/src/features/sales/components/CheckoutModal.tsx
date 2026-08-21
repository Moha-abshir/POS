import React, { useState, useEffect, useRef } from 'react';
import { useCustomers } from '../../customers/api/customers.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';
import { db } from '../../../core/offline/offlineDatabase';
import { api } from '../../../lib/api';
import { X, CreditCard, User, AlertCircle, Building2, Smartphone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomSelect } from '../../../components/ui/CustomSelect';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  totalAmount: number;
  discountAmount?: number;
  onSuccess: (saleData?: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, totalAmount, discountAmount = 0, onSuccess }) => {
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [isBusinessSale, setIsBusinessSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'SPLIT'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number | ''>(totalAmount);
  const [cashAmount, setCashAmount] = useState<number | ''>(0);
  const [mpesaAmount, setMpesaAmount] = useState<number | ''>(0);
  const [customerId, setCustomerId] = useState<string>('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [isStkPush, setIsStkPush] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [isInitiatingPush, setIsInitiatingPush] = useState(false);

  useEffect(() => {
    if (!navigator.onLine && isStkPush) {
      setIsStkPush(false);
    }
  }, [isStkPush]);

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
    setCashAmount(0);
    setMpesaAmount(0);
    setCustomerId('');
    setMpesaRef('');
    setMpesaPhoneNumber('');
    setIsStkPush(false);
    setIsPolling(false);
    setCheckoutRequestId(null);
    setIsInitiatingPush(false);
    onCloseRef.current();
  };

  // Reset amount paid to total when not a credit sale, or 0 when credit sale
  useEffect(() => {
    if (!isCreditSale) {
      setAmountPaid(totalAmount);
    } else {
      setAmountPaid(0);
    }
  }, [isCreditSale, totalAmount]);

  // Reset selected customer when flipping business toggle
  useEffect(() => {
    setCustomerId('');
  }, [isBusinessSale]);

  // Setup split payment defaults when switching to SPLIT or toggling Credit
  useEffect(() => {
    if (paymentMethod === 'SPLIT') {
      if (!isCreditSale) {
        setCashAmount(totalAmount);
        setMpesaAmount(0);
      } else {
        setCashAmount(0);
        setMpesaAmount(0);
      }
    }
  }, [isCreditSale, paymentMethod, totalAmount]);

  const createSaleMutation = useMutation({
    mutationFn: salesApi.createSale,
    networkMode: 'always',
    onMutate: async () => {
      // Cancel outgoing catalog queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot the previous products catalog list
      const previousProducts = queryClient.getQueryData(['products']);

      // Optimistically update stock levels in the UI immediately
      if (previousProducts) {
        const updatedProducts = (previousProducts as any[]).map((product: any) => {
          const updatedVariants = product.variants?.map((variant: any) => {
            const cartItem = cart.find(item => item.variantId === variant.id);
            if (cartItem) {
              const unit = variant.units?.find((u: any) => u.id === cartItem.unitId) || variant.units?.[0];
              const conversionFactor = Number(unit?.conversionFactor || 1);
              const deduction = cartItem.quantity * conversionFactor;
              return {
                ...variant,
                baseStockQuantity: Math.max(0, Number(variant.baseStockQuantity) - deduction)
              };
            }
            return variant;
          });
          return { ...product, variants: updatedVariants };
        });
        queryClient.setQueryData(['products'], updatedProducts);
      }

      return { previousProducts };
    },
    onSuccess: async (data: any) => {
      const isOfflineSale = data?.isOffline || !navigator.onLine;
      const needsStkPush = !isOfflineSale && ((paymentMethod === 'MPESA' && isStkPush) || (paymentMethod === 'SPLIT' && isStkPush && Number(mpesaAmount) > 0));
      
      if (needsStkPush) {
        setIsInitiatingPush(true);
        try {
          const pushAmount = paymentMethod === 'SPLIT' ? Number(mpesaAmount) : (Number(amountPaid) || 0);
          const res = await api.post('/mpesa/checkout/push', {
            saleId: data.id,
            phoneNumber: mpesaPhoneNumber,
            amount: pushAmount
          });
          setCheckoutRequestId(res.data.checkoutRequestId);
          setIsPolling(true);
          toast.success('STK Push sent to customer phone. Waiting for PIN...');
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Failed to send STK push');
          if (navigator.onLine) {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
          }
        } finally {
          setIsInitiatingPush(false);
        }
      } else {
        if (isOfflineSale) {
          toast.success('Sale saved offline! Will sync automatically when back online.');
        } else {
          toast.success('Sale completed successfully!');
        }

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });

        onSuccessRef.current(data);
        handleClose();
      }
    },
    onError: (error: any, _, context) => {
      // Rollback to the previous snapshot state if checkout fails
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
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

  const paidVal = paymentMethod === 'SPLIT' ? (Number(cashAmount) + Number(mpesaAmount)) : (Number(amountPaid) || 0);
  const isCustomerRequired = isCreditSale || isBusinessSale;
  const filteredCustomers = customers.filter((c: any) => 
    isBusinessSale ? c.type === 'BUSINESS' : true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      const cachedSession = await db.settings.get('active_session');
      if (!cachedSession || !cachedSession.value) {
        toast.error('Checkout is blocked. Please open the cash register session (input an opening float) before processing sales.');
        return;
      }
    }

    if (isCustomerRequired && !customerId) {
      toast.error('Customer/Business must be selected for this type of sale');
      return;
    }

    if (paymentMethod === 'SPLIT') {
      const splitTotal = Number(cashAmount) + Number(mpesaAmount);
      if (!isCreditSale && splitTotal !== totalAmount) {
        toast.error(`Split payment total must equal KSh ${totalAmount.toLocaleString()}`);
        return;
      }
      if (isCreditSale && splitTotal > totalAmount) {
        toast.error(`Split payment total cannot exceed KSh ${totalAmount.toLocaleString()}`);
        return;
      }
      if (splitTotal <= 0) {
        toast.error('Total split payment amount must be greater than 0');
        return;
      }
      
      const hasMpesa = Number(mpesaAmount) > 0;
      if (hasMpesa) {
        if (!isStkPush && !mpesaRef && !mpesaPhoneNumber) {
          toast.error('Please provide M-Pesa reference and phone number');
          return;
        }
        if (isStkPush && !mpesaPhoneNumber) {
          toast.error('Phone number is required for STK Push');
          return;
        }
      }
    } else {
      if (paymentMethod === 'MPESA' && !isStkPush && !mpesaRef && !mpesaPhoneNumber) {
        toast.error('Please provide M-Pesa reference and phone number');
        return;
      }
      if (paymentMethod === 'MPESA' && isStkPush && !mpesaPhoneNumber) {
        toast.error('Phone number is required for STK Push');
        return;
      }
    }

    const finalPaid = paymentMethod === 'SPLIT'
      ? (isStkPush ? Number(cashAmount) : Number(cashAmount) + Number(mpesaAmount))
      : ((paymentMethod === 'MPESA' && isStkPush) ? 0 : paidVal);

    const selectedCustomer = customers.find((c: any) => c.id === customerId);

    createSaleMutation.mutate({
      customerId: customerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerBalanceAtSale: selectedCustomer ? (Number(selectedCustomer.balance) || 0) : 0,
      items: cart.map((item: any) => ({
        variantId: item.variantId,
        unitId: item.unitId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        productName: item.productName || item.product?.name || item.name || 'Item',
        variantName: item.variantName || item.variant?.name || 'Default',
        unitName: item.unitName || item.unit?.name || 'Piece',
      })),
      amountPaid: finalPaid,
      discountAmount,
      paymentMethod,
      mpesaRef: paymentMethod === 'MPESA' && !isStkPush 
        ? mpesaRef 
        : (paymentMethod === 'SPLIT' && !isStkPush ? mpesaRef : undefined),
      mpesaPhoneNumber: paymentMethod === 'MPESA' 
        ? mpesaPhoneNumber 
        : (paymentMethod === 'SPLIT' && Number(mpesaAmount) > 0 ? mpesaPhoneNumber : undefined),
      isStkPush: (paymentMethod === 'MPESA' && isStkPush) || (paymentMethod === 'SPLIT' && isStkPush && Number(mpesaAmount) > 0),
      splitDetails: paymentMethod === 'SPLIT' ? {
        cashAmount: Number(cashAmount) || 0,
        mpesaAmount: Number(mpesaAmount) || 0,
        mpesaRef: !isStkPush ? mpesaRef : undefined,
        mpesaPhoneNumber: mpesaPhoneNumber || undefined,
        isStkPush: isStkPush
      } : undefined
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
              <span className="text-xs text-white/50">{paymentMethod === 'SPLIT' ? 'M-Pesa Portion Due' : 'Total Amount Due'}</span>
              <span className="text-base font-bold text-amber-400">KSh {paymentMethod === 'SPLIT' ? Number(mpesaAmount).toLocaleString() : totalAmount.toLocaleString()}</span>
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
          <p className="text-sm text-white/60 text-center leading-relaxed">
            Please wait while we request the payment prompt for phone <span className="font-semibold text-amber-400">{mpesaPhoneNumber}</span>...
          </p>
        </div>
      </div>
    );
  }

  // ── Render 1: Main Checkout Form Redesign ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex justify-center items-center z-50 p-3 sm:p-4 transition-all duration-300">
      <div className={`bg-white rounded-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100 transition-all duration-300 ${
        isCustomerRequired ? 'max-w-lg lg:max-w-4xl' : 'max-w-lg'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100 bg-[#F7F6F4]/60 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Checkout</h2>
            <p className="text-xs text-gray-500">Choose payment method & finalize order</p>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4">
          
          {/* Credit & B2B Toggles */}
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
              <span className="text-xs font-semibold text-gray-700">Credit Sale</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isCreditSale}
                  onChange={(e) => setIsCreditSale(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D97706]"></div>
              </div>
            </label>
            <label className="flex-1 flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700">B2B Sale</span>
              </div>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isBusinessSale}
                  onChange={(e) => setIsBusinessSale(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D97706]"></div>
              </div>
            </label>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit}>
            <div className={`space-y-4 ${isCustomerRequired ? 'lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0' : ''}`}>
              
              {/* Main Payment Section (Full width or Left Column on LG) */}
              <div className={`space-y-4 ${isCustomerRequired ? 'lg:col-span-7' : ''}`}>
                
                {/* Total Amount Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl p-3.5 flex justify-between items-center border border-amber-200/60 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Amount Due</span>
                    {discountAmount > 0 && (
                      <p className="text-[10px] text-amber-700/70">
                        Discount applied: KSh {discountAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#D97706] tracking-tight">KSh {totalAmount.toLocaleString()}</span>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        paymentMethod === 'CASH' 
                          ? 'border-[#D97706] bg-amber-50/50 text-[#D97706]' 
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-xs">Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('MPESA')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        paymentMethod === 'MPESA' 
                          ? 'border-green-600 bg-green-50/40 text-green-700' 
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-xs">M-Pesa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('SPLIT')}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        paymentMethod === 'SPLIT' 
                          ? 'border-purple-600 bg-purple-50/40 text-purple-700' 
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-xs">Split</span>
                    </button>
                  </div>
                </div>

                {/* Split Payment Details */}
                {paymentMethod === 'SPLIT' && (
                  <div className="p-3.5 bg-purple-50/30 rounded-xl border border-purple-200/50 space-y-3 shadow-sm">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Split Payment Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Cash Amount</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">KSh</span>
                          <input
                            type="number"
                            min="0"
                            value={cashAmount}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setCashAmount(val);
                              if (!isCreditSale && val !== '') {
                                const rem = Math.max(0, totalAmount - Number(val));
                                setMpesaAmount(rem);
                              }
                            }}
                            className="w-full pl-9 pr-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">M-Pesa Amount</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">KSh</span>
                          <input
                            type="number"
                            min="0"
                            value={mpesaAmount}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setMpesaAmount(val);
                              if (!isCreditSale && val !== '') {
                                const rem = Math.max(0, totalAmount - Number(val));
                                setCashAmount(rem);
                              }
                            }}
                            className="w-full pl-9 pr-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold flex justify-between items-center px-0.5">
                      <span className="text-gray-500">Split Total:</span>
                      <span className={`font-bold ${
                        (!isCreditSale && Number(cashAmount) + Number(mpesaAmount) !== totalAmount) || (isCreditSale && Number(cashAmount) + Number(mpesaAmount) > totalAmount)
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        KSh {(Number(cashAmount) + Number(mpesaAmount)).toLocaleString()} / {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-Pesa Settings View */}
                {(paymentMethod === 'MPESA' || (paymentMethod === 'SPLIT' && Number(mpesaAmount) > 0)) && (
                  <div className="p-3.5 bg-green-50/40 rounded-xl border border-green-200/50 space-y-3 shadow-inner">
                    {!navigator.onLine && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 font-medium">
                        ⚠️ Offline Mode: Automated STK Push is unavailable. Please ask the customer to pay via Paybill and enter reference below.
                      </div>
                    )}
                    <div className="flex gap-4 border-b border-green-200/60 pb-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="mpesaType" 
                          checked={!isStkPush} 
                          onChange={() => setIsStkPush(false)} 
                          className="text-green-600 focus:ring-green-500 h-3.5 w-3.5" 
                        />
                        <span className="text-xs font-semibold text-green-800">Manual Entry</span>
                      </label>
                      <label className={`flex items-center gap-1.5 ${!navigator.onLine ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input 
                          type="radio" 
                          name="mpesaType" 
                          checked={isStkPush} 
                          onChange={() => {
                            if (navigator.onLine) {
                              setIsStkPush(true);
                            }
                          }} 
                          disabled={!navigator.onLine}
                          className="text-green-600 focus:ring-green-500 h-3.5 w-3.5" 
                        />
                        <span className="text-xs font-semibold text-green-800">STK Push Request</span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {!isStkPush && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-wider">M-Pesa Ref (Optional)</label>
                          <input
                            type="text"
                            value={mpesaRef}
                            onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none shadow-sm text-xs font-bold"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-wider">
                          Phone Number {isStkPush ? '*' : '(Optional)'}
                        </label>
                        <input
                          type="text"
                          value={mpesaPhoneNumber}
                          onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none shadow-sm text-xs font-bold"
                          required={isStkPush}
                        />
                        {isStkPush && <p className="text-[10px] text-green-700 mt-1 font-medium">Format: 2547XXXXXXXX or 07XXXXXXXX</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Paid Field */}
                <div className={`${!isCreditSale ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <label className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">
                    Amount Paid {isCreditSale && <span className="text-[#D97706] text-[11px] font-semibold ml-2">(Editable for Credit)</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">KSh</span>
                    <input
                      type="number"
                      required
                      min="0"
                      disabled={!isCreditSale}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-11 pr-3 py-2.5 text-base font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#D97706] outline-none disabled:bg-[#F7F6F4]/80 disabled:text-gray-500 shadow-sm"
                    />
                  </div>
                </div>

              </div>

              {/* Secondary Customer/Business Panel (Right Column on LG when Credit or B2B is active) */}
              {isCustomerRequired && (
                <div className="lg:col-span-5 flex flex-col h-full justify-between">
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 shadow-sm h-full flex flex-col justify-between space-y-3">
                    <div>
                      <label className="flex items-center text-xs font-bold text-amber-900 mb-2 uppercase tracking-wider">
                        {isBusinessSale ? <Building2 className="w-4 h-4 mr-1.5 text-amber-700" /> : <User className="w-4 h-4 mr-1.5 text-amber-700" />}
                        {isBusinessSale ? 'Select Business Account' : 'Select Customer Account'} 
                        <span className="text-red-500 ml-1.5 font-semibold text-[10px]">*Required</span>
                      </label>
                      <CustomSelect
                        label={`-- Choose a ${isBusinessSale ? 'Business' : 'Customer'} --`}
                        options={filteredCustomers.map((c: any) => ({
                          id: c.id,
                          name: `${c.name} ${c.type === 'BUSINESS' ? '(Business)' : c.type === 'EMPLOYEE' ? '(Employee)' : ''} ${c.phone ? `(${c.phone})` : ''}`
                        }))}
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        searchable={true}
                        required={isCustomerRequired}
                        className="w-full"
                      />
                      {!customerId ? (
                        <p className="mt-2.5 text-xs text-red-600 flex items-center font-medium">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                          {isBusinessSale ? 'Attach a business account to log this B2B invoice.' : 'Attach a customer account for credit recording.'}
                        </p>
                      ) : (
                        <div className="mt-3 p-3 bg-white/80 rounded-xl border border-amber-200/80 text-xs space-y-1">
                          <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wide block">Selected Account</span>
                          <p className="font-bold text-gray-900">{customers.find((c: any) => c.id === customerId)?.name}</p>
                          {customers.find((c: any) => c.id === customerId)?.phone && (
                            <p className="text-gray-500 font-mono text-[11px]">{customers.find((c: any) => c.id === customerId)?.phone}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-amber-200/40 text-[11px] text-amber-800/80 font-medium">
                      💡 Tip: Use the search box above to quickly find registered {isBusinessSale ? 'businesses' : 'customers'} by name or phone.
                    </div>
                  </div>
                </div>
              )}

            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-gray-100 bg-[#F7F6F4]/60 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 font-semibold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            form="checkout-form"
            type="submit"
            disabled={createSaleMutation.isPending || isPolling || isInitiatingPush || (isCustomerRequired && !customerId)}
            className="flex-1 px-5 py-2.5 bg-black hover:bg-black text-white rounded-xl font-semibold text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 cursor-pointer"
          >
            {createSaleMutation.isPending ? 'Processing...' : (
              <>
                Complete Sale
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
