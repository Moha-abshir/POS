import React from 'react';
import { X, Printer, Phone, User, Calendar, Receipt } from 'lucide-react';
import { useSaleDetails } from '../api/sales.api';
import { format } from 'date-fns';

interface ReceiptModalProps {
  saleId: string | null;
  onClose: () => void;
}

export function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
  const { data: sale, isLoading } = useSaleDetails(saleId);

  if (!saleId) return null;

  const handlePrint = () => {
    // In a real app, this would trigger a print-friendly view or use a POS printer library
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Receipt Details</h2>
              {sale && (
                <p className="text-sm text-gray-500 font-mono">#{sale.id.slice(0, 8).toUpperCase()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              disabled={isLoading || !sale}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="Print Receipt"
            >
              <Printer size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading receipt details...</p>
            </div>
          ) : !sale ? (
            <div className="text-center py-12 text-gray-500">
              Receipt not found.
            </div>
          ) : (
            <div className="space-y-8" id="printable-receipt">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-lg p-5 border border-gray-100">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <User size={14} /> Customer
                  </div>
                  <p className="font-medium text-gray-900">{sale.customerName || 'Walk-in Customer'}</p>
                  {sale.customerPhone && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Phone size={12} /> {sale.customerPhone}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar size={14} /> Date & Time
                  </div>
                  <p className="font-medium text-gray-900">
                    {format(new Date(sale.soldAt), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(sale.soldAt), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Purchased Items</h3>
                <div className="space-y-3">
                  {sale.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{item.variantName}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {Number(item.quantity)} {item.unitName} @ KSH {Number(item.sellingPrice).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-medium text-gray-900">KSH {Number(item.subtotal).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Payment */}
              <div className="border-t-2 border-dashed border-gray-200 pt-4 mt-6">
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>KSH {(Number(sale.totalAmount) + Number(sale.discountAmount)).toLocaleString()}</span>
                  </div>
                  {Number(sale.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- KSH {Number(sale.discountAmount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total Amount</span>
                    <span>KSH {Number(sale.totalAmount).toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Amount Paid</span>
                      <span className="font-medium text-gray-900">KSH {Number(sale.amountPaid).toLocaleString()}</span>
                    </div>
                    {Number(sale.totalAmount) > Number(sale.amountPaid) && (
                      <div className="flex justify-between text-sm text-red-600 font-medium">
                        <span>Balance Due</span>
                        <span>KSH {(Number(sale.totalAmount) - Number(sale.amountPaid)).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details Footer */}
              <div className="bg-blue-50/50 rounded-lg p-4 mt-6 flex items-center justify-between border border-blue-100">
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-blue-900">
                    {sale.paymentMethod}
                    {sale.mpesaRef && <span className="ml-2 font-mono text-blue-700">({sale.mpesaRef})</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                    sale.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sale.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
