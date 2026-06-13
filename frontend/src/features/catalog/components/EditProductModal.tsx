import { AxiosError } from 'axios';
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateProduct, useCategories, type Product } from '../api/catalog.api';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, product }) => {
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    unitName: '',
    costPrice: '',
    sellingPrice: '',
    baseStockQuantity: '',
    lowStockThreshold: '',
  });
  
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state with product prop
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name || '',
        categoryId: product.categoryId || '',
        unitName: '', // Edit doesn't have this currently
        costPrice: product.costPrice ? product.costPrice.toString() : '',
        sellingPrice: '', // Edit doesn't have this currently
        baseStockQuantity: product.baseStockQuantity ? product.baseStockQuantity.toString() : '0',
        lowStockThreshold: product.lowStockThreshold ? product.lowStockThreshold.toString() : '0',
      });
      setErrorMsg('');
    }
  }, [isOpen, product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setErrorMsg('');

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: {
          ...formData,
          costPrice: Number(formData.costPrice),
          lowStockThreshold: Number(formData.lowStockThreshold),
        }
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update product');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[600px] m-4 my-8 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
            Edit Product
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Product Name *
              </label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Dewalt Cordless Drill"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Category *
              </label>
              <select
                name="categoryId"
                required
                value={formData.categoryId}
                onChange={handleChange}
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              >
                <option value="" disabled>Select a category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Base Unit Name
              </label>
              <input
                name="unitName"
                type="text"
                value={formData.unitName}
                onChange={handleChange}
                placeholder="e.g., Piece, Box"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Cost Price (KSH) *
              </label>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Selling Price (KSH)
              </label>
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            {(!isNaN(parseFloat(formData.costPrice)) && !isNaN(parseFloat(formData.sellingPrice))) && (
              <div className={`col-span-2 text-[var(--text-sm)] -mt-2 ${parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice) ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
                Margin: KSH {(parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)).toFixed(2)} {
                  parseFloat(formData.costPrice) > 0 
                    ? `(${(((parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(0)}%)`
                    : '(100%)'
                }
              </div>
            )}

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Initial Stock
              </label>
              <input
                name="baseStockQuantity"
                type="number"
                min="0"
                value={formData.baseStockQuantity}
                onChange={handleChange}
                placeholder="0"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Low Stock Alert Threshold *
              </label>
              <input
                name="lowStockThreshold"
                type="number"
                min="0"
                required
                value={formData.lowStockThreshold}
                onChange={handleChange}
                placeholder="10"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>
          </div>
          
          {errorMsg && (
            <p className="mt-2 text-[var(--text-sm)] text-[var(--color-danger)] mb-4">
              {errorMsg}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProduct.isPending || !formData.name || !formData.categoryId || !formData.costPrice || (formData.sellingPrice && parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice))}
              className="h-10 px-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
            >
              {updateProduct.isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
