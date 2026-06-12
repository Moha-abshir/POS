import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

interface PurchaseModalProps {
  onClose: () => void;
}

export function PurchaseModal({ onClose }: PurchaseModalProps) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; costPrice: number }[]>([
    { productId: '', quantity: 1, costPrice: 0 }
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA'>('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getSuppliers(),
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

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId || items.some(i => !i.productId || i.quantity <= 0)) {
      setError("Please fill out all required fields properly.");
      return;
    }

    purchaseMutation.mutate({
      supplierId,
      items,
      amountPaid,
      paymentMethod,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-3xl my-8 border border-[var(--color-border)]">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-base)] sticky top-0 z-10">
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Record Purchase</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><X size={24} /></button>
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
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="bg-[var(--color-bg-base)] px-4 py-3 border-b border-[var(--color-border)] font-medium text-[var(--color-text-primary)] flex justify-between items-center">
              <span>Items</span>
              <button 
                type="button" 
                onClick={() => setItems([...items, { productId: '', quantity: 1, costPrice: 0 }])}
                className="text-sm flex items-center gap-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Product</label>
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value);
                        const newItems = [...items];
                        newItems[index].productId = e.target.value;
                        if (product && newItems[index].costPrice === 0) {
                          newItems[index].costPrice = Number(product.costPrice);
                        }
                        setItems(newItems);
                      }}
                      className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                    >
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Unit Cost</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={item.costPrice}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].costPrice = Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Subtotal</label>
                    <div className="px-3 h-10 flex items-center bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] font-medium">
                      {(item.quantity * item.costPrice).toFixed(2)}
                    </div>
                  </div>
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
              ))}
            </div>
            <div className="bg-[var(--color-bg-base)] px-4 py-3 border-t border-[var(--color-border)] flex justify-end items-center">
              <span className="text-sm text-[var(--color-text-secondary)] mr-4">Total Amount:</span>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">KSH {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-[var(--color-accent-subtle)]/30 p-4 rounded-xl border border-[var(--color-accent-subtle)]">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Amount Paid Now</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full h-10 px-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-10 px-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Notes / Invoice Ref</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              placeholder="e.g. INV-2023-001"
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
  );
}
