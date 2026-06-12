import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X, Plus, Trash2 } from 'lucide-react';

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
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      onClose();
    }
  });

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.some(i => !i.productId || i.quantity <= 0)) {
      alert("Please fill out all required fields properly.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
          <h3 className="text-xl font-semibold text-slate-900">Record Purchase</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center">
              <span>Items</span>
              <button 
                type="button" 
                onClick={() => setItems([...items, { productId: '', quantity: 1, costPrice: 0 }])}
                className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Product</label>
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-slate-500 mb-1">Qty</label>
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-slate-500 mb-1">Unit Cost</label>
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-slate-500 mb-1">Subtotal</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium">
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
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
              <span className="text-sm text-slate-500 mr-4 mt-1">Total Amount:</span>
              <span className="text-lg font-bold text-slate-900">KSH {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid Now</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Invoice Ref</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g. INV-2023-001"
            />
          </div>

          <div className="pt-4 flex gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={purchaseMutation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
            >
              {purchaseMutation.isPending ? 'Recording...' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
