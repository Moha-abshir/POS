import React, { useState } from 'react';
import { X, UserCircle, Phone, MapPin, Receipt, Calendar, Download, DollarSign, CreditCard, RotateCcw, AlertTriangle } from 'lucide-react';
import { type Customer, useCustomerPurchases, useCustomerPayments, useReverseCustomerPayment } from '../api/customers.api';
import { format } from 'date-fns';
import { LoadingSpinner } from '../../../components/ui/Loading';
import { RecordCustomerPaymentModal } from './RecordCustomerPaymentModal';
import { ReceiptModal } from '../../sales/components/ReceiptModal';
import { CustomerPaymentReceiptModal } from './CustomerPaymentReceiptModal';
import toast from 'react-hot-toast';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onRecordPayment: (customer: Customer) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer }) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [selectedPaymentData, setSelectedPaymentData] = useState<any>(null);
  const [paymentToReverse, setPaymentToReverse] = useState<any | null>(null);

  const { data: purchases, isLoading: isPurchasesLoading } = useCustomerPurchases(customer?.id);
  const { data: paymentsList, isLoading: isPaymentsLoading } = useCustomerPayments(customer?.id);
  const reversePaymentMutation = useReverseCustomerPayment();

  if (!isOpen || !customer) return null;

  const initials = customer.name.substring(0, 2).toUpperCase();
  const currentBalance = Number(customer.balance) || 0;

  const handleExportCSV = () => {
    if (!purchases || purchases.length === 0) return;

    const headers = ['Date', 'Receipt #', 'Total Amount', 'Amount Paid', 'Debt', 'Payment Method'];
    const rows = purchases.map((p: any) => {
      const date = format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm');
      const receipt = p.receiptNumber || p.id.slice(0, 8);
      const total = Number(p.totalAmount);
      const paid = Number(p.amountPaid);
      const debt = total > paid ? total - paid : 0;
      return [
        `"${date}"`,
        `"${receipt}"`,
        total,
        paid,
        debt,
        `"${p.paymentMethod}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${customer?.name.replace(/\s+/g, '_')}_purchases.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-medium text-gray-900">Customer Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          
          {/* Left Column: Details */}
          <div className="w-full md:w-1/3 space-y-5 shrink-0">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold mb-2">
                {initials}
              </div>
              {customer.type === 'EMPLOYEE' && (
                <span className="mb-1 px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-purple-200">
                  Employee
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
              
              {/* Balance Display */}
              {(() => {
                if (currentBalance < 0) {
                  return (
                    <p className="mt-1.5 text-lg sm:text-xl font-bold text-red-600">
                      Balance: - KSH {Math.abs(currentBalance).toLocaleString()}
                    </p>
                  );
                }
                return (
                  <p className="mt-1.5 text-lg sm:text-xl font-bold text-green-600">
                    Balance: KSH {currentBalance.toLocaleString()}
                  </p>
                );
              })()}

              {currentBalance > 0 && customer.periodOwed && customer.type !== 'EMPLOYEE' && (
                <span className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                  Period Owed: {customer.periodOwed}
                </span>
              )}

              {/* Record Payment Button - ALWAYS VISIBLE */}
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Record Payment
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              {customer.phone && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{customer.phone}</span>
                </div>
              )}
              {customer.nationalId && (
                <div className="flex items-start gap-3 text-sm">
                  <UserCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">ID: {customer.nationalId}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{customer.address}</span>
                </div>
              )}
              {customer.createdAt && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">Joined {format(new Date(customer.createdAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column: Purchases & Payments */}
          <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-6 md:pt-0 flex flex-col min-w-0">
            
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 mb-4 shrink-0">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'purchases'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'payments'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Payment History
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === 'purchases' ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-gray-400" />
                      Recent Purchases
                    </h4>
                    {purchases && purchases.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#D97706] bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-md transition-colors border border-amber-200 shadow-sm"
                        title="Export purchases to spreadsheet"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                    )}
                  </div>

                  {isPurchasesLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : purchases && purchases.length > 0 ? (
                    <div className="space-y-3">
                      {purchases.map((purchase: any) => {
                        const refundsTotal = (purchase.refunds || []).reduce((sum: number, r: any) => sum + Number(r.totalAmount), 0);
                        const netTotal = Math.max(0, Number(purchase.totalAmount) - refundsTotal);
                        const netDebt = Math.max(0, netTotal - Number(purchase.amountPaid));

                        return (
                          <div 
                            key={purchase.id} 
                            onClick={() => setReceiptSaleId(purchase.id)}
                            className="p-3 border rounded-xl transition-colors cursor-pointer border-gray-200/90 hover:bg-gray-50 bg-white"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {format(new Date(purchase.createdAt), 'MMM d, yyyy - h:mm a')}
                              </span>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-gray-900">
                                  Total: KSH {netTotal.toLocaleString()}
                                </span>
                                {refundsTotal > 0 && (
                                  <span className="text-[11px] text-red-600 font-normal block">
                                    (Refunded: KSH {refundsTotal.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-start mb-1 text-xs">
                              <span className="text-green-600 font-medium">
                                Paid: KSH {Number(purchase.amountPaid).toLocaleString()}
                              </span>
                              {netDebt > 0 && (
                                <span className="text-amber-600 font-medium">
                                  Debt: KSH {netDebt.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-100">
                              <span>Receipt #{purchase.receiptNumber || purchase.id.slice(0, 8)}</span>
                              <span className={purchase.paymentMethod === 'CREDIT' ? 'text-amber-600 font-medium' : ''}>
                                {purchase.paymentMethod}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No purchases found for this customer.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      Payment History
                    </h4>
                  </div>

                  {isPaymentsLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : paymentsList && paymentsList.length > 0 ? (
                    <div className="space-y-3">
                      {paymentsList.map((payment: any) => (
                        <div key={payment.id} className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {format(new Date(payment.paidAt), 'MMM d, yyyy - h:mm a')}
                              </span>
                              {payment.notes && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                  payment.notes.toLowerCase() === 'completed'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {payment.notes}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              KSH {Number(payment.amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500 mt-2 pt-1 border-t border-gray-100">
                            <span>Method: <span className="font-bold text-gray-700">{payment.method}</span></span>
                            {payment.mpesaReceiptNumber && (
                              <span>M-Pesa Ref: <span className="font-mono font-bold text-amber-800">{payment.mpesaReceiptNumber}</span></span>
                            )}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const amt = Number(payment.amount) || 0;
                                  const currentBal = Number(customer?.balance) || 0;
                                  setSelectedPaymentData({
                                    payment,
                                    customer: customer || {},
                                    previousBalance: currentBal + amt,
                                    amountPaid: amt,
                                    newBalance: currentBal
                                  });
                                }}
                                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                Receipt
                              </button>
                              <button
                                onClick={() => setPaymentToReverse(payment)}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded text-[10px] transition-colors flex items-center gap-1 cursor-pointer border border-red-200"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reverse
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No payments recorded yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
          
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {isPaymentModalOpen && (
        <RecordCustomerPaymentModal
          customer={customer!}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {receiptSaleId && (
        <ReceiptModal
          saleId={receiptSaleId}
          onClose={() => setReceiptSaleId(null)}
        />
      )}

      <CustomerPaymentReceiptModal
        isOpen={!!selectedPaymentData}
        onClose={() => setSelectedPaymentData(null)}
        paymentData={selectedPaymentData}
      />

      {/* Payment Reversal Confirmation Modal */}
      {paymentToReverse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPaymentToReverse(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reverse Payment?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action will void this payment and restore the customer's balance.</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Payment Date:</span>
                <span className="font-semibold text-gray-900">{format(new Date(paymentToReverse.paidAt), 'MMM d, yyyy - h:mm a')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Amount:</span>
                <span className="font-bold text-red-600">KSh {Number(paymentToReverse.amount).toLocaleString()} ({paymentToReverse.method})</span>
              </div>
              <div className="border-t border-amber-200/60 pt-2 flex justify-between font-bold text-gray-900">
                <span>Restored Balance:</span>
                <span className="text-amber-800">
                  KSh {Number(customer.balance).toLocaleString()} + KSh {Number(paymentToReverse.amount).toLocaleString()} = KSh {(Number(customer.balance) + Number(paymentToReverse.amount)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPaymentToReverse(null)}
                disabled={reversePaymentMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reversePaymentMutation.mutate({
                    customerId: customer.id,
                    paymentId: paymentToReverse.id,
                  }, {
                    onSuccess: () => {
                      toast.success(`Payment of KSh ${Number(paymentToReverse.amount).toLocaleString()} reversed successfully`);
                      setPaymentToReverse(null);
                    },
                    onError: (err: any) => {
                      toast.error(err.response?.data?.message || err.message || 'Failed to reverse payment');
                    }
                  });
                }}
                disabled={reversePaymentMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {reversePaymentMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
