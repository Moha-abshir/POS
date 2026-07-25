import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProducts } from '../../catalog/api/catalog.api';
import { inventoryApi } from '../api/inventory.api';
import { X, AlertTriangle } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import toast from 'react-hot-toast';

interface ReportDamageModalProps {
  onClose: () => void;
}

const PREDEFINED_REASONS = [
  { id: 'Expired', name: 'Expired' },
  { id: 'Broken by Customer', name: 'Broken by Customer' },
  { id: 'Damaged in Transit', name: 'Damaged in Transit' },
  { id: 'Theft', name: 'Theft' },
  { id: 'Other', name: 'Other (Specify below)' },
];

export function ReportDamageModal({ onClose }: ReportDamageModalProps) {
  const queryClient = useQueryClient();
  const [variantId, setVariantId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reasonCategory, setReasonCategory] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: products = [] } = useProducts();

  const damageMutation = useMutation({
    mutationFn: inventoryApi.recordDamage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['damages'] });
      toast.success('Damage reported successfully');
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
    if (!variantId || !unitId || quantity === '' || quantity <= 0) {
      setError("Please fill out all required fields properly with a valid quantity.");
      return;
    }

    if (!reasonCategory) {
      setError("Please select a reason category.");
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

    let finalReason = reasonCategory;
    if (reasonCategory === 'Other') {
      if (!customReason.trim()) {
        setError("Please specify the reason.");
        return;
      }
      finalReason = customReason.trim();
    }
    if (notes.trim()) {
      finalReason += ` - Notes: ${notes.trim()}`;
    }

    damageMutation.mutate({ variantId, quantity: finalQuantity, reason: finalReason });
  };

  const selectedVariant = variantOptions.find(v => v.id === variantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[var(--color-border)]">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-red-50 rounded-t-xl">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <h3 className="text-lg font-bold">Report Inventory Loss</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Variant</label>
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
              }}
              className="bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <CustomSelect
              required
              label="Select reason..."
              options={PREDEFINED_REASONS}
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="bg-white"
            />
          </div>

          {reasonCategory === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please Specify
              </label>
              <input
                type="text"
                required
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm"
                placeholder="Type specific reason here"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <CustomSelect
              required
              label="Select unit..."
              options={selectedVariant?.units?.map((u: any) => ({ id: u.id, name: u.name })) || []}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Affected
            </label>
            <input
              type="number"
              required
              min={0.001}
              step="any"
              value={quantity === '' ? '' : quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm"
              placeholder="e.g., 5"
            />
            {typeof quantity === 'number' && selectedVariant && (
              (() => {
                const selectedUnit = selectedVariant.units?.find((u: any) => u.id === unitId) || selectedVariant.units?.[0];
                const availableQuantity = Number(selectedVariant.baseStockQuantity) / Number(selectedUnit?.conversionFactor || 1);
                if (quantity > availableQuantity) {
                  return (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">
                      Note: You entered {quantity}, but only {availableQuantity} {selectedUnit?.name || ''}(s) are currently in stock. This action will be rejected.
                    </p>
                  );
                }
                return null;
              })()
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none shadow-sm"
              placeholder="Provide specific context or audit trails..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 pt-4 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={damageMutation.isPending}
              className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {damageMutation.isPending ? 'Saving...' : 'Report Loss'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
