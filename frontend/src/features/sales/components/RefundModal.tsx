import React, { useState } from 'react';
import { X, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useRefundSale } from '../api/sales.api';
import toast from 'react-hot-toast';

interface RefundModalProps {
  sale: any;
  onClose: () => void;
}

export function RefundModal({ sale, onClose }: RefundModalProps) {
  const refundMutation = useRefundSale();
  const [reason, setReason] = useState('');
  
  // Track selected items and their refund quantities
  // Format: { [itemKey]: { selected: boolean, quantity: number } }
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: { selected: boolean; quantity: number };
  }>({});

  const getItemKey = (item: any) => `${item.variantId}:${item.unitId}`;

  // Helper to calculate previously refunded quantities from sale.refunds
  const getPreviouslyRefundedQty = (item: any) => {
    if (!sale.refunds) return 0;
    return sale.refunds.reduce((total: number, refund: any) => {
      const matched = refund.items?.find(
        (ri: any) => ri.variantId === item.variantId && ri.unitId === item.unitId
      );
      return total + (matched ? Number(matched.quantity) : 0);
    }, 0);
  };

  const handleCheckboxChange = (item: any, checked: boolean) => {
    const key = getItemKey(item);
    const prevRefunded = getPreviouslyRefundedQty(item);
    const maxQty = Number(item.quantity) - prevRefunded;
    
    setSelectedItems(prev => ({
      ...prev,
      [key]: {
        selected: checked,
        quantity: checked ? maxQty : 0
      }
    }));
  };

  const handleQtyChange = (item: any, value: string) => {
    const key = getItemKey(item);
    const qty = parseFloat(value) || 0;
    const prevRefunded = getPreviouslyRefundedQty(item);
    const maxQty = Number(item.quantity) - prevRefunded;

    setSelectedItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: Math.min(qty, maxQty)
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map selected items into payload format
    const refundItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key].selected && selectedItems[key].quantity > 0)
      .map(key => {
        const [variantId, unitId] = key.split(':');
        return {
          variantId,
          unitId,
          quantity: selectedItems[key].quantity
        };
      });

    if (refundItems.length === 0) {
      toast.error('Please select at least one item and specify its quantity to refund');
      return;
    }

    refundMutation.mutate(
      {
        id: sale.id,
        refundData: {
          reason: reason.trim() || undefined,
          items: refundItems
        }
      },
      {
        onSuccess: () => {
          toast.success('Refund processed successfully!');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Failed to process refund');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--color-border)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-700 rounded-lg flex items-center justify-center">
              <RefreshCcw size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Process Sale Refund</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">Sale #{sale.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Credit Sale Warning if Customer Debt exists */}
          {sale.customerId && Number(sale.totalAmount) > Number(sale.amountPaid) && (
            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-[var(--radius-md)] flex items-start gap-2.5 text-xs font-medium">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold uppercase text-[10px] tracking-wider text-amber-800">Credit Sale Notice</p>
                <p className="mt-0.5">This customer still owes a balance of KSH {(Number(sale.totalAmount) - Number(sale.amountPaid)).toLocaleString()} on this sale. Processing this refund will automatically adjust and reduce their outstanding balance first.</p>
              </div>
            </div>
          )}

          {/* Items Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Items to Refund</h3>
            
            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
              {sale.items?.map((item: any) => {
                const key = getItemKey(item);
                const prevRefunded = getPreviouslyRefundedQty(item);
                const maxQty = Number(item.quantity) - prevRefunded;
                const isSelected = !!selectedItems[key]?.selected;
                const inputQty = selectedItems[key]?.quantity ?? 0;
                
                // Elegant name displays
                const isGenericVariant = !item.variantName || item.variantName === 'Default' || item.variantName === 'Standard';
                const displayName = item.productName 
                  ? `${item.productName}${isGenericVariant ? '' : ` - ${item.variantName}`}`
                  : item.variantName;

                return (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isSelected ? 'border-[var(--color-accent)] bg-amber-50/20' : 'border-[var(--color-border)] hover:bg-gray-50'
                    } ${maxQty <= 0 ? 'opacity-50 pointer-events-none bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                      <input 
                        type="checkbox"
                        id={`check-${key}`}
                        checked={isSelected}
                        disabled={maxQty <= 0}
                        onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label htmlFor={`check-${key}`} className="min-w-0 cursor-pointer flex-1 select-none">
                        <p className="text-sm font-semibold text-gray-900 truncate uppercase tracking-wide">{displayName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sold: {Number(item.quantity)} {item.unitName} 
                          {prevRefunded > 0 && <span className="text-red-600 font-medium ml-1.5">(Refunded: {prevRefunded})</span>}
                        </p>
                      </label>
                    </div>

                    {/* Quantity Input */}
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="0.001"
                        max={maxQty}
                        step="any"
                        value={isSelected ? inputQty : ''}
                        disabled={!isSelected}
                        placeholder={maxQty.toString()}
                        onChange={(e) => handleQtyChange(item, e.target.value)}
                        className="w-18 h-9 text-center bg-white border border-gray-300 rounded-[var(--radius-md)] text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="text-xs text-gray-500 font-medium select-none min-w-[32px]">{item.unitName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Reason */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Refund Reason</label>
            <textarea
              placeholder="Provide a reason for the return (e.g. damaged goods, wrong order)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all resize-none"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-[var(--color-border)] flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 h-10 border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-text-secondary)] bg-white hover:bg-[var(--color-bg-base)] transition-all select-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={refundMutation.isPending}
              className="flex-1 h-10 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded-[var(--radius-md)] text-sm font-semibold transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              {refundMutation.isPending ? (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white"></div>
              ) : (
                <>
                  <RefreshCcw size={16} />
                  <span>Submit Refund</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
