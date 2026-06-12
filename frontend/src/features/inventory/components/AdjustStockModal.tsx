import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X } from 'lucide-react';

interface AdjustStockModalProps {
  onClose: () => void;
}

export function AdjustStockModal({ onClose }: AdjustStockModalProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'ADJUST' | 'DAMAGE'>('ADJUST');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const { data: products = [] } = useProducts();

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      onClose();
    }
  });

  const damageMutation = useMutation({
    mutationFn: inventoryApi.recordDamage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity <= 0 && mode === 'DAMAGE') return;

    if (mode === 'ADJUST') {
      adjustMutation.mutate({ productId, newQuantity: quantity, notes });
    } else {
      damageMutation.mutate({ productId, quantity, reason: notes });
    }
  };

  const selectedProduct = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">Stock Adjustment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode('ADJUST'); setQuantity(Number(selectedProduct?.baseStockQuantity || 0)); }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === 'ADJUST' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Set Exact Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('DAMAGE'); setQuantity(1); }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === 'DAMAGE' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
            >
              Record Damage
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
            <select
              required
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                if (mode === 'ADJUST') {
                  const p = products.find(x => x.id === e.target.value);
                  setQuantity(p ? Number(p.baseStockQuantity) : 0);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Current: {p.baseStockQuantity})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {mode === 'ADJUST' ? 'New Total Quantity' : 'Quantity Damaged/Lost'}
            </label>
            <input
              type="number"
              required
              min={mode === 'DAMAGE' ? 0.001 : 0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder={mode === 'DAMAGE' ? "e.g. Broken in transit" : "e.g. Physical count"}
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
              disabled={adjustMutation.isPending || damageMutation.isPending}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${mode === 'ADJUST' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {mode === 'ADJUST' ? 'Save Adjustment' : 'Confirm Damage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
