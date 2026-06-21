import React, { useState } from 'react';
import { X, Printer, Receipt, RefreshCcw } from 'lucide-react';
import { useSaleDetails } from '../api/sales.api';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { RefundModal } from './RefundModal';
import { LoadingSpinner } from '../../../components/ui/Loading';

interface ReceiptModalProps {
  saleId: string | null;
  onClose: () => void;
}

export function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
  const { data: sale, isLoading } = useSaleDetails(saleId);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  // Fetch business and cashier details to display on the receipt
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    enabled: !!saleId,
  });

  const getPreviouslyRefundedQty = (item: any) => {
    if (!sale?.refunds) return 0;
    return sale.refunds.reduce((total: number, refund: any) => {
      const matched = refund.items?.find(
        (ri: any) => ri.variantId === item.variantId && ri.unitId === item.unitId
      );
      return total + (matched ? Number(matched.quantity) : 0);
    }, 0);
  };

  const getRemainingReturnableQty = () => {
    if (!sale?.items) return 0;
    return sale.items.reduce((total: number, item: any) => {
      const prevRefunded = getPreviouslyRefundedQty(item);
      return total + Math.max(0, Number(item.quantity) - prevRefunded);
    }, 0);
  };

  if (!saleId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Print styles stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything except the receipt wrapper */
          body > * {
            display: none !important;
          }
          #print-root-wrapper {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-receipt {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 380px !important;
            padding: 10px !important;
          }
        }
      `}} />

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[var(--color-bg-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--color-border)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Receipt Preview</h2>
              {sale && (
                <p className="text-xs text-[var(--color-text-muted)] font-mono">#{sale.id.slice(0, 8).toUpperCase()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sale && getRemainingReturnableQty() > 0 && (
              <button 
                onClick={() => setIsRefundModalOpen(true)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 cursor-pointer no-print"
                title="Refund Items"
              >
                <RefreshCcw size={20} />
              </button>
            )}
            <button 
              onClick={handlePrint}
              disabled={isLoading || !sale}
              className="p-2 text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              title="Print Receipt"
            >
              <Printer size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 flex justify-center items-start">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <LoadingSpinner size="md" />
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Loading receipt...</p>
            </div>
          ) : !sale ? (
            <div className="text-center py-20 text-[var(--color-text-muted)] w-full">
              Receipt not found.
            </div>
          ) : (
            <div id="print-root-wrapper" className="w-full">
              {/* Receipt Roll Container */}
              <div 
                id="printable-receipt" 
                className="relative w-full max-w-[380px] mx-auto bg-white text-gray-900 shadow-lg border border-gray-200/60 flex flex-col"
              >
                {/* Sawtooth Top Edge */}
                <div className="w-full h-2.5 select-none overflow-hidden relative bg-transparent no-print">
                  <svg className="absolute bottom-0 left-0 w-full h-2.5 fill-white" viewBox="0 0 24 3" preserveAspectRatio="none">
                    <path d="M0,3 L1,0 L2,3 L3,0 L4,3 L5,0 L6,3 L7,0 L8,3 L9,0 L10,3 L11,0 L12,3 L13,0 L14,3 L15,0 L16,3 L17,0 L18,3 L19,0 L20,3 L21,0 L22,3 L23,0 L24,3 Z" />
                  </svg>
                </div>

                {/* Receipt Inner Paper */}
                <div className="px-6 py-8 font-mono text-xs leading-relaxed">
                  {/* Shop Details */}
                  <div className="text-center space-y-1 mb-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                      {meData?.business?.name || 'SMART STORE POS'}
                    </h3>
                    {meData?.business?.sector && (
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-sans">
                        {meData.business.sector}
                      </p>
                    )}
                    {meData?.business?.location && (
                      <p className="text-[11px] text-gray-600 font-sans">
                        {meData.business.location}
                      </p>
                    )}
                    {meData?.business?.phone && (
                      <p className="text-[11px] text-gray-600">
                        TEL: {meData.business.phone}
                      </p>
                    )}
                    <div className="text-gray-400 py-1 text-[11px]">--------------------------------</div>
                    <h4 className="text-[13px] font-bold tracking-widest text-gray-800">SALES RECEIPT</h4>
                    <div className="text-gray-400 py-1 text-[11px]">--------------------------------</div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-[11px] mb-5 text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase">Receipt No:</span>
                      <span className="font-bold text-gray-950">#{sale.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase">Date/Time:</span>
                      <span>{format(new Date(sale.soldAt), 'dd/MM/yyyy h:mm a')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase">Cashier:</span>
                      <span>
                        {((meData?.user?.firstName || '') + ' ' + (meData?.user?.lastName || '')).trim() || 'System Cashier'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase">Customer:</span>
                      <span className="font-semibold text-gray-950">{sale.customerName || 'Walk-in Customer'}</span>
                    </div>
                    {sale.customerPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 uppercase">Phone:</span>
                        <span>{sale.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div className="mb-5">
                    <div className="text-gray-400 text-[11px] pb-1">--------------------------------</div>
                    <div className="flex justify-between text-[10px] font-extrabold text-gray-500 tracking-wider pb-1">
                      <span>ITEMS & QTY</span>
                      <span className="text-right">TOTAL</span>
                    </div>
                    <div className="text-gray-400 text-[11px] pb-2">--------------------------------</div>

                    <div className="space-y-3.5">
                      {sale.items?.map((item: any) => {
                        // Display product name and variant name elegantly. Avoid showing "Default" or "Standard" variant names.
                        const isGenericVariant = !item.variantName || item.variantName === 'Default' || item.variantName === 'Standard';
                        const displayName = item.productName 
                          ? `${item.productName}${isGenericVariant ? '' : ` - ${item.variantName}`}`
                          : item.variantName;

                        return (
                          <div key={item.id} className="text-[11px] text-gray-800">
                            {/* Product Name */}
                            <div className="font-bold text-gray-950 uppercase tracking-wide">{displayName}</div>
                            {/* Quantity, Unit, Price, Total */}
                            <div className="flex justify-between items-center text-gray-600 mt-1">
                              <span>
                                {Number(item.quantity)} {item.unitName || 'Piece'}(s) @ KSH {Number(item.sellingPrice).toLocaleString()}
                              </span>
                              <span className="font-bold text-gray-900">
                                KSH {Number(item.subtotal).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="space-y-1.5 text-[11px] pt-2 border-t border-dashed border-gray-300 mb-5">
                    <div className="flex justify-between text-gray-600">
                      <span>SUBTOTAL</span>
                      <span>KSH {(Number(sale.totalAmount) + Number(sale.discountAmount)).toLocaleString()}</span>
                    </div>
                    {Number(sale.discountAmount) > 0 && (
                      <div className="flex justify-between text-green-700 font-medium">
                        <span>DISCOUNT</span>
                        <span>- KSH {Number(sale.discountAmount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="text-gray-300 py-0.5">................................</div>
                    <div className="flex justify-between text-xs font-extrabold text-gray-950 py-0.5">
                      <span>TOTAL AMOUNT</span>
                      <span>KSH {Number(sale.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>AMOUNT PAID</span>
                      <span>KSH {Number(sale.amountPaid).toLocaleString()}</span>
                    </div>
                    
                    {Number(sale.amountPaid) > Number(sale.totalAmount) ? (
                      <div className="flex justify-between text-green-700 font-bold border-t border-dotted border-gray-200 pt-1">
                        <span>CHANGE</span>
                        <span>KSH {(Number(sale.amountPaid) - Number(sale.totalAmount)).toLocaleString()}</span>
                      </div>
                    ) : Number(sale.totalAmount) > Number(sale.amountPaid) ? (
                      <div className="flex justify-between text-red-600 font-bold border-t border-dotted border-gray-200 pt-1">
                        <span>BALANCE DUE</span>
                        <span>KSH {(Number(sale.totalAmount) - Number(sale.amountPaid)).toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-1.5 text-[11px] pt-3 border-t border-dashed border-gray-300 mb-6">
                    <div className="flex justify-between text-gray-700">
                      <span className="text-gray-400">PAYMENT METHOD:</span>
                      <span className="font-bold uppercase">{sale.paymentMethod}</span>
                    </div>
                    {sale.mpesaRef && (
                      <div className="flex justify-between text-gray-700">
                        <span className="text-gray-400">MPESA REF NO:</span>
                        <span className="font-bold text-amber-800 tracking-wide font-mono">{sale.mpesaRef}</span>
                      </div>
                    )}
                    {sale.mpesaPhoneNumber && (
                      <div className="flex justify-between text-gray-700">
                        <span className="text-gray-400">MPESA PHONE:</span>
                        <span>{sale.mpesaPhoneNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">STATUS:</span>
                      <span className={`inline-flex items-center font-extrabold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                        sale.paymentStatus === 'PAID' ? 'bg-green-50 text-green-800 border border-green-200' :
                        sale.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Refunds / Returns Section */}
                  {sale.refunds && sale.refunds.length > 0 && (
                    <div className="pt-3 border-t border-dashed border-gray-300 mb-5">
                      <div className="text-gray-950 text-[11px] font-extrabold uppercase tracking-widest text-center mb-2 flex items-center justify-center gap-1.5">
                        <RefreshCcw size={12} className="shrink-0" />
                        <span>Returns & Refunds</span>
                      </div>
                      
                      <div className="space-y-4">
                        {sale.refunds.map((refund: any) => (
                          <div key={refund.id} className="text-[11px] text-gray-800 space-y-1">
                            <div className="flex justify-between font-bold text-gray-950">
                              <span>REFUND #{refund.id.slice(0, 6).toUpperCase()}</span>
                              <span>{format(new Date(refund.refundedAt), 'dd/MM/yy HH:mm')}</span>
                            </div>
                            
                            {refund.reason && (
                              <p className="text-[10px] text-gray-500 italic mt-0.5">Reason: {refund.reason}</p>
                            )}

                            <div className="space-y-1.5 pl-2 border-l border-gray-300 mt-1.5">
                              {refund.items?.map((ri: any) => {
                                const originalItem = sale.items?.find(
                                  (item: any) => item.variantId === ri.variantId && item.unitId === ri.unitId
                                );
                                const isGenericVariant = !originalItem?.variantName || originalItem.variantName === 'Default' || originalItem.variantName === 'Standard';
                                const displayName = originalItem 
                                  ? (originalItem.productName ? `${originalItem.productName}${isGenericVariant ? '' : ` - ${originalItem.variantName}`}` : originalItem.variantName)
                                  : 'Unknown Product';

                                return (
                                  <div key={ri.id} className="flex justify-between items-center text-gray-700">
                                    <span>
                                      - {Number(ri.quantity)} {originalItem?.unitName || 'Unit'}(s) @ KSH {Number(ri.unitPrice).toLocaleString()}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      - KSH {Number(ri.subtotal).toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between text-xs font-extrabold text-gray-950 pt-1.5 border-t border-dotted border-gray-300 mt-1">
                              <span>REFUNDED AMOUNT</span>
                              <span>KSH {Number(refund.totalAmount).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cumulative Refund summary */}
                      <div className="mt-4 pt-2 border-t border-dashed border-gray-300 flex justify-between text-[11px] font-extrabold text-gray-950">
                        <span>TOTAL REFUNDED</span>
                        <span>
                          KSH {sale.refunds.reduce((sum: number, r: any) => sum + Number(r.totalAmount), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer message */}
                  <div className="text-gray-400 text-[11px] text-center mb-4">--------------------------------</div>
                  <div className="text-center space-y-1.5 text-[10px] text-gray-500 font-sans tracking-wide mb-6">
                    <p className="font-extrabold uppercase text-gray-800">THANK YOU FOR SHOPPING WITH US!</p>
                    <p className="text-[9px]">GOODS ONCE SOLD ARE NOT RETURNABLE</p>
                    <p className="text-[9px]">PLEASE VISIT US AGAIN!</p>
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col items-center justify-center pt-2 opacity-80 select-none">
                    <div className="flex items-center h-8 gap-[1px]">
                      {[2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,1,3,1,2,1,4,2,1,3,1,2].map((w, idx) => (
                        <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <p className="text-[8px] tracking-[3px] mt-1 text-gray-500 font-mono">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Sawtooth Bottom Edge */}
                <div className="w-full h-2.5 select-none overflow-hidden relative bg-transparent no-print">
                  <svg className="absolute top-0 left-0 w-full h-2.5 fill-white" viewBox="0 0 24 3" preserveAspectRatio="none">
                    <path d="M0,0 L1,3 L2,0 L3,3 L4,0 L5,3 L6,0 L7,3 L8,0 L9,3 L10,0 L11,3 L12,0 L13,3 L14,0 L15,3 L16,0 L17,3 L18,0 L19,3 L20,0 L21,3 L22,0 L23,3 L24,0 Z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isRefundModalOpen && sale && (
        <RefundModal 
          sale={sale} 
          onClose={() => setIsRefundModalOpen(false)} 
        />
      )}
    </div>
  );
}
