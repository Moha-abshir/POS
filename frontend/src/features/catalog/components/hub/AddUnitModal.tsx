import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCreateProductUnit, type Product } from '../../api/catalog.api';
import { AxiosError } from 'axios';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({ isOpen, onClose, product }) => {
  const createUnit = useCreateProductUnit();
  const [formData, setFormData] = useState({
    name: '',
    sellingPrice: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', sellingPrice: '' });
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createUnit.mutateAsync({
        id: product.id,
        data: {
          name: formData.name,
          sellingPrice: Number(formData.sellingPrice),
          isDefault: false,
          conversionFactor: 1, // simplified for this modal
        }
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to add unit');
    }
  };

  const newPriceNum = Number(formData.sellingPrice);
  const costPriceNum = Number(product.costPrice);
  const margin = newPriceNum - costPriceNum;
  const isBelowCost = newPriceNum < costPriceNum && formData.sellingPrice !== '';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[400px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Add Unit</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Unit Name *</label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g., Half Bag"
              value={formData.name}
              onChange={handleChange}
              className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
            />
          </div>
          
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Selling Price *</label>
            <input
              name="sellingPrice"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={handleChange}
              className={`w-full h-10 px-3 bg-[var(--color-bg-inset)] border ${isBelowCost ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'} rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 transition-all`}
            />
          </div>

          <div className="flex justify-between items-center text-[var(--text-sm)] text-[var(--color-text-secondary)] bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <span>Margin:</span>
            <span className={`font-medium ${isBelowCost ? 'text-red-500' : 'text-green-600'}`}>
              KSH {margin.toFixed(2)}
            </span>
          </div>

          {errorMsg && <div className="text-red-500 text-[var(--text-sm)]">{errorMsg}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createUnit.isPending || isBelowCost || !formData.sellingPrice || !formData.name} 
              className="h-10 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createUnit.isPending ? 'Adding...' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
