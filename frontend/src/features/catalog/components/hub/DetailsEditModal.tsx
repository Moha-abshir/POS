import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUpdateProduct, useCategories, type Product } from '../../api/catalog.api';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import { ImageUploader } from '../../../../components/ui/ImageUploader';
import { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';

interface DetailsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const DetailsEditModal: React.FC<DetailsEditModalProps> = ({ isOpen, onClose, product }) => {
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });
  const productMode = meData?.business?.productMode || 'ADVANCED';

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    imageUrl: '',
    code: '',
    costPrice: '',
    sellingPrice: '',
    minimumPrice: '',
    lowStockThreshold: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const standardVariant = product.variants?.[0];
      const defaultUnit = standardVariant?.units?.[0];
      setFormData({
        name: product.name || '',
        categoryId: product.categoryId || '',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        code: standardVariant?.sku || '',
        costPrice: standardVariant?.costPrice !== undefined ? standardVariant.costPrice.toString() : '',
        sellingPrice: defaultUnit?.sellingPrice !== undefined ? defaultUnit.sellingPrice.toString() : '',
        minimumPrice: defaultUnit?.minimumPrice !== undefined ? (defaultUnit.minimumPrice ? defaultUnit.minimumPrice.toString() : '') : '',
        lowStockThreshold: standardVariant?.lowStockThreshold !== undefined ? standardVariant.lowStockThreshold.toString() : '',
      });
      setErrorMsg('');
    }
  }, [isOpen, product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (productMode === 'SIMPLE') {
        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            name: formData.name,
            code: formData.code,
            costPrice: Number(formData.costPrice || 0),
            sellingPrice: Number(formData.sellingPrice || 0),
            minimumPrice: formData.minimumPrice ? Number(formData.minimumPrice) : null,
            lowStockThreshold: Number(formData.lowStockThreshold || 0),
            categoryId: formData.categoryId || undefined,
            description: formData.description,
            imageUrl: formData.imageUrl || undefined,
          }
        });
      } else {
        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            name: formData.name,
            categoryId: formData.categoryId || undefined,
            description: formData.description,
            imageUrl: formData.imageUrl || undefined,
          }
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update details');
    }
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[500px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Edit Details</h2>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto">
          {productMode === 'SIMPLE' ? (
            <>
              <div>
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Product Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                />
              </div>
              <div>
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Item Code (SKU) (Auto-generated)</label>
                <input
                  name="code"
                  type="text"
                  readOnly
                  value={formData.code}
                  className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-gray-500 opacity-70 cursor-not-allowed outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">Cost Price *</label>
                  <input
                    name="costPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">Selling Price *</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">Min Price (Optional)</label>
                  <input
                    name="minimumPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumPrice}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">Low Stock Level *</label>
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    required
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Product Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                />
              </div>
              <div>
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Category (Optional)</label>
                <CustomSelect
                  label="Select category (Optional)"
                  options={[{ id: '', name: 'Uncategorized (None)' }, ...(categories?.map(c => ({ id: c.id, name: c.name })) || [])]}
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 bg-[var(--color-bg-inset)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--text-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-none"
                />
              </div>
            </>
          )}

          {productMode === 'ADVANCED' && (
            <div>
              <ImageUploader
                label="Product Image (Optional)"
                value={formData.imageUrl}
                onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
              />
            </div>
          )}

          {errorMsg && <div className="text-red-500 text-[var(--text-sm)]">{errorMsg}</div>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={updateProduct.isPending} className="h-10 px-6 bg-black hover:bg-black text-white text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50">
              {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
