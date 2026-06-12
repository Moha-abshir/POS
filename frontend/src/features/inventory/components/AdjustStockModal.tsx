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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--color-border)]">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-base)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Stock Adjustment</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-[var(--color-bg-sunken)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setMode('ADJUST'); setQuantity(Number(selectedProduct?.baseStockQuantity || 0)); }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer select-none ${mode === 'ADJUST' ? 'bg-white shadow-sm text-[var(--color-text-primary)] border border-[var(--color-border)]' : 'text-[var(--color-text-secondary)] border border-transparent'}`}
            >
              Set Exact Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('DAMAGE'); setQuantity(1); }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer select-none ${mode === 'DAMAGE' ? 'bg-[var(--color-danger-bg)] shadow-sm text-[var(--color-danger)] border border-[var(--color-danger-bg)]' : 'text-[var(--color-text-secondary)] border border-transparent'}`}
            >
              Record Damage
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Product</label>
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
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
            >
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Current: {p.baseStockQuantity})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              {mode === 'ADJUST' ? 'New Total Quantity' : 'Quantity Damaged/Lost'}
            </label>
            <input
              type="number"
              required
              min={mode === 'DAMAGE' ? 0.001 : 0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Reason / Notes</label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              placeholder={mode === 'DAMAGE' ? "e.g. Broken in transit" : "e.g. Physical count"}
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
              disabled={adjustMutation.isPending || damageMutation.isPending}
              className={`flex-1 px-4 py-2 h-10 text-white rounded-[var(--radius-md)] font-medium disabled:opacity-50 cursor-pointer ${mode === 'ADJUST' ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]' : 'bg-[var(--color-danger)] hover:opacity-90'}`}
            >
              {mode === 'ADJUST' ? 'Save Adjustment' : 'Confirm Damage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
