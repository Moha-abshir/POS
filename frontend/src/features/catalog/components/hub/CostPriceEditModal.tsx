import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUpdateProduct, type Product } from '../../api/catalog.api';
import { AxiosError } from 'axios';

interface CostPriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const CostPriceEditModal: React.FC<CostPriceEditModalProps> = ({ isOpen, onClose, product }) => {
  const updateProduct = useUpdateProduct();
  const [costPrice, setCostPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCostPrice(product.costPrice ? product.costPrice.toString() : '');
      setErrorMsg('');
    }
  }, [isOpen, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: { costPrice: Number(costPrice) }
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update cost price');
    }
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[400px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Edit Cost Price</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            <span>Current cost price:</span>
            <span className="font-medium text-[var(--color-text-primary)]">KSH {Number(product.costPrice).toFixed(2)}</span>
          </div>
          
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">New cost price *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)]">
            Note: This is used as the default unit cost when recording new purchases.
          </p>

          {errorMsg && <div className="text-red-500 text-[var(--text-sm)]">{errorMsg}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={updateProduct.isPending} className="h-10 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50">
              {updateProduct.isPending ? 'Updating...' : 'Update Cost Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
