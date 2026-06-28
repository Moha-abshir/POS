import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';

interface PurchaseModalProps {
  onClose: () => void;
}

export function PurchaseModal({ onClose }: PurchaseModalProps) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId?: string; variantId: string; unitId: string; quantity: number | ''; costPrice: number | '' }[]>([
    { productId: '', variantId: '', unitId: '', quantity: 1, costPrice: '' }
  ]);
  const [paymentStatus, setPaymentStatus] = useState<'FULL' | 'PARTIAL' | 'UNPAID'>('FULL');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getSuppliers(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: products = [] } = useProducts();

  const purchaseMutation = useMutation({
    mutationFn: inventoryApi.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record purchase. Please try again.');
    }
  });

  const totalAmount = items.reduce((sum, item) => {
    const q = typeof item.quantity === 'number' ? item.quantity : 0;
    const c = typeof item.costPrice === 'number' ? item.costPrice : 0;
    return sum + (q * c);
  }, 0);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId || items.some(i => !i.variantId || !i.unitId || (typeof i.quantity !== 'number' || i.quantity <= 0))) {
      setError("Please fill out all required fields properly.");
      return;
    }
    if (paymentMethod === 'MPESA' && !mpesaRef.trim()) {
      setError("Please provide the M-Pesa reference number.");
      return;
    }

    // Payment Amount Validation
    const amountPaidNum = amountPaid === '' ? 0 : amountPaid;
    if (amountPaidNum < 0 || amountPaidNum > totalAmount) {
      setError(`Payment amount must be between 0 and ${totalAmount.toFixed(2)}.`);
      return;
    }

    purchaseMutation.mutate({
      supplierId,
      items: items.map(i => ({
        variantId: i.variantId,
        unitId: i.unitId,
        quantity: i.quantity as number,
        costPrice: i.costPrice === '' ? 0 : (i.costPrice as number)
      })),
      amountPaid: paymentStatus === 'FULL' ? totalAmount : (paymentStatus === 'UNPAID' ? 0 : (amountPaid === '' ? 0 : amountPaid)),
      paymentMethod,
      invoiceRef: invoiceRef.trim() || undefined,
      mpesaRef: paymentMethod === 'MPESA' ? mpesaRef.trim() : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-5xl my-8 border border-[var(--color-border)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
            Record Purchase
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-[var(--radius-md)] flex items-start gap-2 text-[var(--color-danger)]">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Supplier *</label>
              <CustomSelect
                required
                label="Select a supplier..."
                options={suppliers.map(s => ({ id: s.id, name: s.name }))}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              />
              {selectedSupplier && (
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Current balance: <span className="font-medium text-[var(--color-text-primary)]">KSH {Number(selectedSupplier.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding</span>
                </p>
              )}
            </div>
          </div>

          <div className="border border-[var(--color-border)] rounded-xl">
            <div className="bg-[var(--color-bg-base)] px-4 py-3 border-b border-[var(--color-border)] rounded-t-xl font-medium text-[var(--color-text-primary)] flex justify-between items-center">
              <span>Items</span>
              <button 
                type="button" 
                onClick={() => setItems([...items, { productId: '', variantId: '', unitId: '', quantity: 1, costPrice: '' }])}
                className="text-sm flex items-center gap-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="w-[20%]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Product</label>
                    <CustomSelect
                      required
                      searchable
                      label="Select product..."
                      options={products.map(p => ({ id: p.id, name: p.name }))}
                      value={item.productId || ''}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].productId = e.target.value;
                        newItems[index].variantId = '';
                        newItems[index].unitId = '';
                        setItems(newItems);
                      }}
                    />
                  </div>
                  <div className="w-[20%]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Variant</label>
                    <CustomSelect
                      required
                      label="Select variant..."
                      options={
                        item.productId 
                          ? (products.find(p => p.id === item.productId)?.variants || []).map(v => ({ id: v.id, name: v.name }))
                          : []
                      }
                      value={item.variantId}
                      onChange={(e) => {
                        const selectedProduct = products.find(p => p.id === item.productId);
                        const selectedVar = selectedProduct?.variants?.find(v => v.id === e.target.value);
                        const newItems = [...items];
                        newItems[index].variantId = e.target.value;
                        const defaultUnit = selectedVar?.units?.find((u: any) => u.isDefault) || selectedVar?.units?.[0];
                        newItems[index].unitId = defaultUnit?.id || '';
                        if (selectedVar && newItems[index].costPrice === '') {
                          const factor = Number(defaultUnit?.conversionFactor || 1);
                          newItems[index].costPrice = Number(selectedVar.costPrice) * factor;
                        }
                        setItems(newItems);
                      }}
                    />
                  </div>
                  <div className="w-[15%]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Unit</label>
                    <CustomSelect
                      required
                      label="Select unit..."
                      options={
                        item.productId && item.variantId 
                          ? (products.find(p => p.id === item.productId)?.variants?.find(v => v.id === item.variantId)?.units || []).map((u: any) => ({ id: u.id, name: u.name }))
                          : []
                      }
                      value={item.unitId}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].unitId = e.target.value;
                        const selectedProduct = products.find(p => p.id === item.productId);
                        const selectedVar = selectedProduct?.variants?.find(v => v.id === newItems[index].variantId);
                        const selectedUnit = selectedVar?.units?.find((u: any) => u.id === e.target.value);
                        if (selectedVar && selectedUnit) {
                          newItems[index].costPrice = Number(selectedVar.costPrice) * Number(selectedUnit.conversionFactor || 1);
                        }
                        setItems(newItems);
                      }}
                    />
                  </div>
                  <div className="w-[10%] min-w-[60px]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min="0.001"
                      step="any"
                      value={item.quantity === '' ? '' : item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = e.target.value === '' ? '' : Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                    />
                  </div>
                  <div className="w-[20%] min-w-[80px]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Unit Cost</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={item.costPrice === '' ? '' : item.costPrice}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].costPrice = e.target.value === '' ? '' : Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                    />
                  </div>
                  <div className="w-[20%] min-w-[80px]">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Subtotal</label>
                    <div className="px-3 h-10 flex items-center bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {((typeof item.quantity === 'number' ? item.quantity : 0) * (typeof item.costPrice === 'number' ? item.costPrice : 0)).toFixed(2)}
                    </div>
                  </div>
                  <div className="w-[5%] min-w-[40px] flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        if(items.length > 1) {
                          setItems(items.filter((_, i) => i !== index));
                        }
                      }}
                      className="p-2 h-10 w-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[var(--color-bg-base)] px-4 py-3 border-t border-[var(--color-border)] rounded-b-xl flex justify-end items-center">
              <span className="text-sm text-[var(--color-text-secondary)] mr-4">Total Amount:</span>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">KSH {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-[var(--color-bg-sunken)] p-5 rounded-xl border border-[var(--color-border)] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Payment Status</label>
                <CustomSelect
                  label="Select Status"
                  options={[
                    { id: 'FULL', name: 'Fully Paid' },
                    { id: 'PARTIAL', name: 'Partially Paid' },
                    { id: 'UNPAID', name: 'Unpaid' }
                  ]}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="bg-white"
                />
              </div>

              {paymentStatus === 'PARTIAL' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Amount Paid Now</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={amountPaid === '' ? '' : amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                  />
                </div>
              )}
            </div>

            {paymentStatus !== 'UNPAID' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Payment Method</label>
                  <CustomSelect
                    label="Payment Method"
                    options={[
                      { id: 'CASH', name: 'Cash' },
                      { id: 'MPESA', name: 'M-Pesa' }
                    ]}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="bg-white"
                  />
                </div>
                {paymentMethod === 'MPESA' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">M-Pesa Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. QWE123RTY"
                      value={mpesaRef}
                      onChange={(e) => setMpesaRef(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all uppercase"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Invoice Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. INV-2023-001"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              />
            </div>

          <div className="pt-4 flex gap-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 h-10 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-sunken)] transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={purchaseMutation.isPending}
              className="flex-1 px-4 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors font-medium disabled:opacity-50 cursor-pointer"
            >
              {purchaseMutation.isPending ? 'Recording...' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
