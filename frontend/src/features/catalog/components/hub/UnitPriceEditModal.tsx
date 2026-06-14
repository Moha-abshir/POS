import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useUpdateProductUnit, type Product } from '../../api/catalog.api';
import { AxiosError } from 'axios';

interface UnitPriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  unit: { id: string; name: string; sellingPrice: string } | null;
}

export const UnitPriceEditModal: React.FC<UnitPriceEditModalProps> = ({ isOpen, onClose, product, unit }) => {
  const updateUnit = useUpdateProductUnit();
  const [sellingPrice, setSellingPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && unit) {
      setSellingPrice(unit.sellingPrice ? unit.sellingPrice.toString() : '');
      setErrorMsg('');
    }
  }, [isOpen, unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;
    setErrorMsg('');
    try {
      await updateUnit.mutateAsync({
        id: product.id,
        unitId: unit.id,
        data: { sellingPrice: Number(sellingPrice) }
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update price');
    }
  };

  const newPriceNum = Number(sellingPrice);
  const costPriceNum = Number(product.costPrice);
  const margin = newPriceNum - costPriceNum;
  const isBelowCost = newPriceNum < costPriceNum && sellingPrice !== '';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[400px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Change Price</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {unit && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mb-4">
              Updating price for: <span className="font-semibold text-[var(--color-text-primary)]">{unit.name} — {product.name}</span>
            </div>

            <div className="flex justify-between items-center text-[var(--text-sm)] text-[var(--color-text-secondary)]">
              <span>Current price:</span>
              <span className="font-medium text-[var(--color-text-primary)]">KSH {Number(unit.sellingPrice).toFixed(2)}</span>
            </div>
            
            <div>
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">New price *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className={`w-full h-10 px-3 bg-[var(--color-bg-inset)] border ${isBelowCost ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'} rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 transition-all`}
              />
            </div>

            <div className="flex justify-between items-center text-[var(--text-sm)] text-[var(--color-text-secondary)] bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <span>Margin at new price:</span>
              <span className={`font-medium ${isBelowCost ? 'text-red-500' : 'text-green-600'}`}>
                KSH {margin.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-3 text-[13px] text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <p>
                This applies to all new sales from this point forward. Existing sales are not affected.
              </p>
            </div>

            {errorMsg && <div className="text-red-500 text-[var(--text-sm)]">{errorMsg}</div>}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={updateUnit.isPending || isBelowCost || !sellingPrice} 
                className="h-10 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateUnit.isPending ? 'Updating...' : 'Update Price'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
