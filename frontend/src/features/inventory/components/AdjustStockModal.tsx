import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';

interface AdjustStockModalProps {
  onClose: () => void;
}

export function AdjustStockModal({ onClose }: AdjustStockModalProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'ADJUST' | 'DAMAGE'>('ADJUST');
  const [variantId, setVariantId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: products = [] } = useProducts();

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to adjust stock. Please try again.');
    }
  });

  const damageMutation = useMutation({
    mutationFn: inventoryApi.recordDamage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record damage. Please try again.');
    }
  });

  const variantOptions = products.flatMap(p => 
    (p.variants || []).map(v => ({
      id: v.id,
      name: (p.variants || []).length > 1 ? `${p.name} - ${v.name} (Current: ${Number(v.baseStockQuantity)})` : `${p.name} (Current: ${Number(v.baseStockQuantity)})`,
      baseStockQuantity: v.baseStockQuantity,
      units: v.units || []
    }))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!variantId || !unitId || quantity === '' || quantity < 0 || (quantity <= 0 && mode === 'DAMAGE')) {
      setError("Please fill out all required fields properly.");
      return;
    }

    let finalQuantity = quantity as number;
    const selectedVar = variantOptions.find(v => v.id === variantId);
    if (selectedVar && unitId) {
      const selectedUnit = selectedVar.units.find((u: any) => u.id === unitId);
      if (selectedUnit) {
        finalQuantity = finalQuantity * Number(selectedUnit.conversionFactor || 1);
      }
    }

    if (mode === 'ADJUST') {
      adjustMutation.mutate({ variantId, newQuantity: finalQuantity, notes });
    } else {
      damageMutation.mutate({ variantId, quantity: finalQuantity, reason: notes });
    }
  };


  const selectedVariant = variantOptions.find(v => v.id === variantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--color-border)]">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-base)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Stock Adjustment</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-[var(--radius-md)] flex items-start gap-2 text-[var(--color-danger)]">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex bg-[var(--color-bg-sunken)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { 
                setMode('ADJUST'); 
                if (selectedVariant && unitId) {
                  const u = selectedVariant.units.find((x: any) => x.id === unitId);
                  setQuantity(Number(selectedVariant.baseStockQuantity) / Number(u?.conversionFactor || 1));
                } else {
                  setQuantity(selectedVariant ? Number(selectedVariant.baseStockQuantity) : '');
                }
              }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer select-none ${mode === 'ADJUST' ? 'bg-white shadow-sm text-[var(--color-text-primary)] border border-[var(--color-border)]' : 'text-[var(--color-text-secondary)] border border-transparent'}`}
            >
              Set Exact Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('DAMAGE'); setQuantity(''); }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer select-none ${mode === 'DAMAGE' ? 'bg-[var(--color-danger-bg)] shadow-sm text-[var(--color-danger)] border border-[var(--color-danger-bg)]' : 'text-[var(--color-text-secondary)] border border-transparent'}`}
            >
              Record Damage
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Product Variant</label>
            <CustomSelect
              required
              searchable
              label="Select product variant..."
              options={variantOptions}
              value={variantId}
              onChange={(e) => {
                setVariantId(e.target.value);
                const v = variantOptions.find(x => x.id === e.target.value);
                const defaultUnit = v?.units?.find((u: any) => u.isDefault) || v?.units?.[0];
                setUnitId(defaultUnit?.id || '');
                if (mode === 'ADJUST') {
                  setQuantity(v ? Number(v.baseStockQuantity) / Number(defaultUnit?.conversionFactor || 1) : '');
                }
              }}
              className="bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Unit</label>
            <CustomSelect
              required
              label="Select unit..."
              options={selectedVariant?.units?.map((u: any) => ({ id: u.id, name: u.name })) || []}
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                if (mode === 'ADJUST' && selectedVariant) {
                  const u = selectedVariant.units.find((x: any) => x.id === e.target.value);
                  setQuantity(Number(selectedVariant.baseStockQuantity) / Number(u?.conversionFactor || 1));
                }
              }}
              className="bg-white"
            />
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
              value={quantity === '' ? '' : quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
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
