import React, { useState } from 'react';
import { X, Phone, Mail, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { type Supplier, useSupplierPayments, useSupplierPurchases } from '../api/suppliers.api';
import { format } from 'date-fns';
import { LoadingSpinner } from '../../../components/ui/Loading';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({ isOpen, onClose, supplier }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'purchases'>('payments');
  
  const { data: payments, isLoading: loadingPayments } = useSupplierPayments(supplier?.id);
  const { data: purchases, isLoading: loadingPurchases } = useSupplierPurchases(supplier?.id);

  if (!isOpen || !supplier) return null;

  const initials = supplier.name.substring(0, 2).toUpperCase();

  const handleExportPaymentsCSV = () => {
    if (!payments || payments.length === 0) return;

    const headers = ['Date', 'Amount', 'Method', 'M-PESA Reference'];
    const rows = payments.map((p: any) => {
      const date = format(new Date(p.paidAt), 'yyyy-MM-dd HH:mm');
      return [
        `"${date}"`,
        p.amount,
        `"${p.method}"`,
        `"${p.mpesaReceiptNumber || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${supplier?.name.replace(/\\s+/g, '_')}_payments.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPurchasesCSV = () => {
    if (!purchases || purchases.length === 0) return;

    const headers = ['Date', 'Invoice #', 'Total Amount', 'Amount Paid', 'Debt', 'Payment Method'];
    const rows = purchases.map((p: any) => {
      const date = format(new Date(p.purchasedAt), 'yyyy-MM-dd HH:mm');
      const invoice = p.referenceNumber || p.id.slice(0, 8);
      const total = Number(p.totalAmount);
      const paid = Number(p.amountPaid);
      const debt = total > paid ? total - paid : 0;
      return [
        `"${date}"`,
        `"${invoice}"`,
        total,
        paid,
        debt,
        `"${p.paymentMethod || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${supplier?.name.replace(/\\s+/g, '_')}_purchases.csv`);
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
          <h2 className="text-base font-medium text-gray-900">Supplier Ledger</h2>
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
          <div className="w-full md:w-1/3 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold mb-3">
                {initials}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
              <p className={`mt-1 text-sm font-medium ${Number(supplier.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Owed: KSH {Number(supplier.balance).toLocaleString()}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              {supplier.phone && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{supplier.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ledger (Tabs) */}
          <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-6 md:pt-0 flex flex-col">
            
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200 mb-4 shrink-0">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
                    activeTab === 'payments' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Payment History
                </button>
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
                    activeTab === 'purchases' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recent Purchases
                </button>
              </div>

              {/* Export Button based on active tab */}
              {activeTab === 'payments' && payments && payments.length > 0 && (
                <button
                  onClick={handleExportPaymentsCSV}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors border border-blue-200 shadow-sm"
                  title="Export payments to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              )}
              {activeTab === 'purchases' && purchases && purchases.length > 0 && (
                <button
                  onClick={handleExportPurchasesCSV}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors border border-blue-200 shadow-sm"
                  title="Export purchases to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-2">
              {activeTab === 'payments' && (
                <div>
                  {loadingPayments ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : payments && payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment: any) => (
                        <div key={payment.id} className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 bg-green-100 text-green-600 p-1.5 rounded-full shrink-0">
                              <ArrowUpRight size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {format(new Date(payment.paidAt), 'MMM d, yyyy - h:mm a')}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {payment.method} {payment.mpesaReceiptNumber ? `• ${payment.mpesaReceiptNumber}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-green-600">
                              KSH {Number(payment.amount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No payment history found.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'purchases' && (
                <div>
                  {loadingPurchases ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : purchases && purchases.length > 0 ? (
                    <div className="space-y-3">
                      {purchases.map((purchase: any) => {
                        const total = Number(purchase.totalAmount);
                        const paid = Number(purchase.amountPaid);
                        const debt = total > paid ? total - paid : 0;
                        
                        return (
                          <div key={purchase.id} className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 bg-blue-100 text-blue-600 p-1.5 rounded-full shrink-0">
                                  <ArrowDownRight size={14} />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 block">
                                    {format(new Date(purchase.purchasedAt), 'MMM d, yyyy - h:mm a')}
                                  </span>
                                  {purchase.referenceNumber && (
                                    <span className="text-xs text-gray-500">Invoice: {purchase.referenceNumber}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                KSH {total.toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50">
                              <div className="bg-green-50 p-1.5 rounded text-center">
                                <div className="text-[10px] text-green-600 uppercase tracking-wider font-semibold">Paid</div>
                                <div className="text-sm font-medium text-green-700">KSH {paid.toLocaleString()}</div>
                              </div>
                              <div className="bg-red-50 p-1.5 rounded text-center">
                                <div className="text-[10px] text-red-600 uppercase tracking-wider font-semibold">Debt</div>
                                <div className="text-sm font-medium text-red-700">KSH {debt.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No recent purchases.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
