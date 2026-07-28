import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory.api';
import { X, Calendar, User, FileText, Smartphone, DollarSign, Package } from 'lucide-react';
import { LoadingSpinner } from '../../../components/ui/Loading';
import { api } from '../../../lib/api';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string | null;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ isOpen, onClose, purchaseId }) => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });
  const productMode = meData?.business?.productMode || 'ADVANCED';

  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ['purchase-details', purchaseId],
    queryFn: () => inventoryApi.getPurchaseDetails(purchaseId!),
    enabled: isOpen && !!purchaseId,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--color-accent)]" />
              Purchase Transaction Details
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Reference ID: {purchaseId?.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-2xs border border-transparent hover:border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <LoadingSpinner />
              <p className="text-xs text-gray-400 font-medium">Fetching transaction details...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Failed to load purchase details</p>
                <p>{(error as any)?.message || 'An unexpected error occurred.'}</p>
              </div>
            </div>
          ) : purchase ? (
            <div className="space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium w-24">Purchased At:</span>
                    <span className="font-semibold text-gray-800">{new Date(purchase.purchasedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium w-24">Supplier:</span>
                    <span className="font-semibold text-gray-800">{purchase.supplierName || 'Walk-in / Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium w-24">Invoice Ref:</span>
                    <span className="font-semibold text-gray-800 font-mono">{purchase.invoiceRef || '-'}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <Smartphone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium w-24">M-Pesa Ref:</span>
                    <span className="font-semibold text-gray-800 font-mono">{purchase.mpesaRef || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium w-24">Total Amount:</span>
                    <span className="font-bold text-gray-900">KSH {Number(purchase.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <div className="w-4 h-4 rounded-full border border-gray-400/20 bg-gray-400/10 flex items-center justify-center text-[9px] font-bold text-gray-500">P</div>
                    <span className="font-medium w-24">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      purchase.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border border-green-200' :
                      purchase.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {purchase.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Purchased Items Ledger</h3>
                
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 p-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                    <div>{productMode === 'SIMPLE' ? 'Product' : 'Product & Variant'}</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-right">Unit Cost (KES)</div>
                    <div className="text-right">Subtotal (KES)</div>
                  </div>

                  {/* Table Content */}
                  <div className="divide-y divide-gray-100">
                    {purchase.items?.map((item) => (
                      <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr] gap-2 sm:gap-4 p-4 sm:p-3 hover:bg-gray-50/50 transition-colors items-center">
                        {/* Name */}
                        <div className="w-full text-left">
                          <p className="text-sm font-bold text-gray-900">{item.productName}</p>
                          {productMode !== 'SIMPLE' && item.variantName && (
                            <p className="text-xs text-gray-500 mt-0.5">Variant: {item.variantName}</p>
                          )}
                        </div>
                        
                        {/* Qty */}
                        <div className="w-full sm:text-center flex justify-between sm:justify-center items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider sm:hidden">Quantity</span>
                          <span className="text-sm font-semibold text-gray-700 font-mono">
                            {Number(item.quantity).toFixed(1)} {productMode !== 'SIMPLE' ? item.unitName : ''}
                          </span>
                        </div>

                        {/* Unit Cost */}
                        <div className="w-full sm:text-right flex justify-between sm:justify-end items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider sm:hidden">Unit Cost</span>
                          <span className="text-sm font-medium text-gray-600 font-mono">
                            KSH {Number(item.costPrice).toFixed(2)}
                          </span>
                        </div>

                        {/* Subtotal */}
                        <div className="w-full sm:text-right flex justify-between sm:justify-end items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider sm:hidden">Subtotal</span>
                          <span className="text-sm font-bold text-gray-900 font-mono">
                            KSH {Number(item.subtotal).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
