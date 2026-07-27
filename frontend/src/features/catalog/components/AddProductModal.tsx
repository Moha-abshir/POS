import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { useCreateProduct, useCategories } from '../api/catalog.api';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { ImageUploader } from '../../../components/ui/ImageUploader';
import { AxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { db } from '../../../core/offline/offlineDatabase';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnitRow {
  id: string;
  name: string;
  sellingPrice: string;
  conversionFactor: string;
  isDefault: boolean;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose }) => {
  const createProduct = useCreateProduct();
  const { data: categories } = useCategories();

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
    variantName: 'Standard', // Default variant name
    code: '', // Simple mode item code
    costPrice: '',
    sellingPrice: '', // Simple mode selling price
    minimumPrice: '', // Simple mode minimum price
    baseUnitName: 'Piece', // Default base unit
    initialStock: '',
    lowStockThreshold: '',
  });

  const [units, setUnits] = useState<UnitRow[]>([
    { id: '1', name: 'Piece', sellingPrice: '', conversionFactor: '1', isDefault: true }
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (productMode === 'SIMPLE') {
        db.products.count().then(count => {
          const nextCode = String(count + 1).padStart(4, '0');
          setFormData(prev => ({ ...prev, code: nextCode }));
        }).catch(() => {});
      }
    } else {
      setFormData({
        name: '',
        categoryId: '',
        description: '',
        imageUrl: '',
        variantName: 'Standard',
        code: '',
        costPrice: '',
        sellingPrice: '',
        minimumPrice: '',
        baseUnitName: 'Piece',
        initialStock: '',
        lowStockThreshold: '',
      });
      setUnits([{ id: '1', name: 'Piece', sellingPrice: '', conversionFactor: '1', isDefault: true }]);
      setErrorMsg('');
    }
  }, [isOpen, productMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (id: string, field: keyof UnitRow, value: string | boolean) => {
    setUnits(prev => prev.map(unit => {
      if (unit.id === id) {
        return { ...unit, [field]: value };
      }
      return unit;
    }));
  };

  const handleSetDefaultUnit = (id: string) => {
    setUnits(prev => prev.map(unit => ({
      ...unit,
      isDefault: unit.id === id
    })));
  };

  const addUnitRow = () => {
    setUnits(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', sellingPrice: '', conversionFactor: '', isDefault: false }
    ]);
  };

  const removeUnitRow = (id: string) => {
    if (units.length <= 1) return;
    
    setUnits(prev => {
      const filtered = prev.filter(u => u.id !== id);
      if (!filtered.some(u => u.isDefault) && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (productMode === 'SIMPLE') {
        await createProduct.mutateAsync({
          name: formData.name,
          code: formData.code,
          costPrice: Number(formData.costPrice || 0),
          sellingPrice: Number(formData.sellingPrice || 0),
          minimumPrice: formData.minimumPrice ? Number(formData.minimumPrice) : null,
          lowStockThreshold: Number(formData.lowStockThreshold || 0),
          categoryId: formData.categoryId || undefined,
          description: formData.description,
          imageUrl: formData.imageUrl || undefined,
          initialStock: Number(formData.initialStock || 0),
        });
      } else {
        await createProduct.mutateAsync({
          name: formData.name,
          categoryId: formData.categoryId || undefined,
          description: formData.description,
          imageUrl: formData.imageUrl || undefined,
          variants: [
            {
              name: formData.variantName,
              costPrice: Number(formData.costPrice),
              baseUnitName: formData.baseUnitName,
              initialStock: Number(formData.initialStock || 0),
              lowStockThreshold: Number(formData.lowStockThreshold || 0),
              units: units.map(u => ({
                name: u.name,
                sellingPrice: Number(u.sellingPrice),
                conversionFactor: Number(u.conversionFactor || 1),
                isDefault: u.isDefault
              }))
            }
          ]
        });
      }

      onClose();
      setFormData({
        name: '',
        categoryId: '',
        description: '',
        imageUrl: '',
        variantName: 'Standard',
        code: '',
        costPrice: '',
        sellingPrice: '',
        minimumPrice: '',
        baseUnitName: 'Piece',
        initialStock: '',
        lowStockThreshold: '',
      });
      setUnits([{ id: '1', name: 'Piece', sellingPrice: '', conversionFactor: '1', isDefault: true }]);
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to create product');
    }
  };

  const cost = parseFloat(formData.costPrice) || 0;

  const hasEmptyUnits = units.some(u => !u.name || !u.sellingPrice || !u.conversionFactor);
  const hasNegativeMargins = productMode === 'SIMPLE'
    ? (cost > 0 && (parseFloat(formData.sellingPrice) || 0) < cost)
    : units.some(u => {
        const sp = parseFloat(u.sellingPrice) || 0;
        const cf = parseFloat(u.conversionFactor) || 1;
        const unitCost = cost * cf;
        return cost > 0 && sp < unitCost;
      });
  
  const isSaveDisabled = 
    createProduct.isPending || 
    !formData.name || 
    !formData.costPrice || 
    (productMode === 'SIMPLE' ? (!formData.code || !formData.sellingPrice) : (!formData.baseUnitName || hasEmptyUnits));

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={() => !createProduct.isPending && onClose()}
      />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[600px] m-4 my-8 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
            Add Product
          </h2>
          <button 
            onClick={() => !createProduct.isPending && onClose()}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          <form id="add-product-form" onSubmit={handleSubmit} className="space-y-6">
            {productMode === 'SIMPLE' ? (
              /* Simple Product Info */
              <div className="space-y-4">
                <div>
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                    Product Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Dola Maize Flour"
                    className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Item Code (SKU) (Auto-generated)
                    </label>
                    <input
                      name="code"
                      type="text"
                      readOnly
                      value={formData.code}
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] text-gray-500 opacity-70 cursor-not-allowed outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Category (Optional)
                    </label>
                    <CustomSelect
                      name="categoryId"
                      label="Select a category (Optional)"
                      options={[{ id: '', name: 'Uncategorized (None)' }, ...(categories?.map(cat => ({ id: cat.id, name: cat.name })) || [])]}
                      value={formData.categoryId}
                      onChange={handleChange as any}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Purchase Price (Cost) *
                    </label>
                    <input
                      name="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.costPrice}
                      onChange={handleChange}
                      placeholder="e.g. 6150"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Selling Price *
                    </label>
                    <input
                      name="sellingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      placeholder="e.g. 6350"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Minimum Price (Optional)
                    </label>
                    <input
                      name="minimumPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minimumPrice}
                      onChange={handleChange}
                      placeholder="e.g. 6250"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Low Stock Threshold (Re-Order Level) *
                    </label>
                    <input
                      name="lowStockThreshold"
                      type="number"
                      min="0"
                      required
                      value={formData.lowStockThreshold}
                      onChange={handleChange}
                      placeholder="e.g., 1"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Initial Stock Quantity *
                    </label>
                    <input
                      name="initialStock"
                      type="number"
                      min="0"
                      required
                      value={formData.initialStock}
                      onChange={handleChange}
                      placeholder="0"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] h-10 flex items-end pb-1 leading-tight">
                      Description (Optional)
                    </label>
                    <input
                      name="description"
                      type="text"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Product details..."
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Advanced Product Info (Old Way) */
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                      Product Name *
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Portland Cement"
                      className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Category (Optional)
                      </label>
                      <CustomSelect
                        name="categoryId"
                        label="Select a category (Optional)"
                        options={[{ id: '', name: 'Uncategorized (None)' }, ...(categories?.map(cat => ({ id: cat.id, name: cat.name })) || [])]}
                        value={formData.categoryId}
                        onChange={handleChange as any}
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Description (Optional)
                      </label>
                      <input
                        name="description"
                        type="text"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Product details..."
                        className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <ImageUploader
                      label="Product Image (Optional)"
                      value={formData.imageUrl}
                      onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                    />
                  </div>
                </div>

                {/* Default Variant Info */}
                <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-[var(--text-md)] font-semibold text-[var(--color-text-primary)]">Variant Details</h3>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-[12px] rounded-[var(--radius-md)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-lg text-center leading-relaxed">
                        This creates the first variant (e.g. "Standard" or "50kg Bag"). You can add more variants later from the product details page.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Variant Name *
                      </label>
                      <input
                        name="variantName"
                        type="text"
                        required
                        value={formData.variantName}
                        onChange={handleChange}
                        placeholder="e.g., Standard, 50kg"
                        className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Base Tracking Unit *
                      </label>
                      <input
                        name="baseUnitName"
                        type="text"
                        required
                        value={formData.baseUnitName}
                        onChange={handleChange}
                        placeholder="e.g., Piece, Kg, L"
                        className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Base Cost Price (KSH) *
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
                    <div>
                      <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                        Initial Stock (in {formData.baseUnitName || 'Base Units'}) *
                      </label>
                      <input
                        name="initialStock"
                        type="number"
                        min="0"
                        required
                        value={formData.initialStock}
                        onChange={handleChange}
                        placeholder="0"
                        className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                      Low Stock Alert Threshold
                    </label>
                    <input
                      name="lowStockThreshold"
                      type="number"
                      min="0"
                      required
                      value={formData.lowStockThreshold}
                      onChange={handleChange}
                      placeholder="10"
                      className="block w-full sm:w-1/2 h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                    />
                  </div>
                </div>

                {/* Units Section */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <h3 className="text-[var(--text-md)] font-semibold text-[var(--color-text-primary)]">Sales Units</h3>
                      <span className="text-[12px] text-[var(--color-text-muted)]">How you package and price this variant.</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={addUnitRow}
                      className="h-9 px-3 flex items-center gap-1.5 rounded-[var(--radius-sm)] text-[var(--text-sm)] font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Package Unit
                    </button>
                  </div>

                  <div className="space-y-4">
                    {units.map((unit, index) => (
                      <div key={unit.id} className="relative group p-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] mb-1">
                              Unit Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={unit.name}
                              onChange={(e) => handleUnitChange(unit.id, 'name', e.target.value)}
                              placeholder="e.g. Bag, Box, Pallet"
                              className="block w-full h-9 px-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] mb-1">
                              Selling Price (KSH) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={unit.sellingPrice}
                              onChange={(e) => handleUnitChange(unit.id, 'sellingPrice', e.target.value)}
                              placeholder="0.00"
                              className="block w-full h-9 px-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                              Conversion Factor *
                              <div className="group/help relative inline-block">
                                <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-[var(--radius-md)] opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all pointer-events-none z-50 shadow-lg text-center font-normal leading-normal">
                                  How many "{formData.baseUnitName || 'Base Units'}" make up this package. e.g. Box of 12 has factor 12.
                                </div>
                              </div>
                            </label>
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              required
                              disabled={index === 0 && unit.isDefault}
                              value={unit.conversionFactor}
                              onChange={(e) => handleUnitChange(unit.id, 'conversionFactor', e.target.value)}
                              placeholder="1"
                              className="block w-full h-9 px-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] border-dashed">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={unit.isDefault}
                              onChange={() => handleSetDefaultUnit(unit.id)}
                              className="w-4 h-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                            />
                            <span className="text-[13px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                              {unit.isDefault && <span className="text-amber-500">★</span>} 
                              Default unit
                            </span>
                          </label>
                          
                          {units.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeUnitRow(unit.id)}
                              className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Margin Indicators */}
            {cost > 0 && (productMode === 'SIMPLE' ? (parseFloat(formData.sellingPrice) > 0) : units.some(u => u.name && u.sellingPrice && u.conversionFactor)) && (
              <div className="bg-[var(--color-bg-sunken)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Expected Margins:</h4>
                  {hasNegativeMargins && (
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Warning: Selling below cost
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {productMode === 'SIMPLE' ? (
                    (() => {
                      const sp = parseFloat(formData.sellingPrice) || 0;
                      const margin = sp - cost;
                      const marginPercent = cost > 0 ? (margin / cost) * 100 : 100;
                      const isNegative = margin < 0;

                      return (
                        <div className="flex items-center text-[14px]">
                          <span className="font-medium text-[var(--color-text-primary)] w-24 truncate">Selling Margin</span>
                          <span className="text-[var(--color-text-muted)] mx-2">→</span>
                          <span className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            KSH {margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                          </span>
                          {isNegative && <span className="ml-2 text-[12px] text-red-500 italic">below cost</span>}
                          <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">Cost: {cost.toFixed(2)}</span>
                        </div>
                      );
                    })()
                  ) : (
                    units.filter(u => u.name && u.sellingPrice && u.conversionFactor).map(unit => {
                      const sp = parseFloat(unit.sellingPrice) || 0;
                      const cf = parseFloat(unit.conversionFactor) || 1;
                      const unitCost = cost * cf;
                      const margin = sp - unitCost;
                      const marginPercent = unitCost > 0 ? (margin / unitCost) * 100 : 100;
                      const isNegative = margin < 0;

                      return (
                        <div key={`margin-${unit.id}`} className="flex items-center text-[14px]">
                          <span className="font-medium text-[var(--color-text-primary)] w-24 truncate">{unit.name}</span>
                          <span className="text-[var(--color-text-muted)] mx-2">→</span>
                          <span className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            KSH {margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                          </span>
                          {isNegative && <span className="ml-2 text-[12px] text-red-500 italic">below cost</span>}
                          <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">Cost: {unitCost.toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-[var(--radius-md)] text-[14px]">
                {errorMsg}
              </div>
            )}
            
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] rounded-b-[var(--radius-lg)]">
          <button
            type="button"
            onClick={() => !createProduct.isPending && onClose()}
            className="h-10 px-4 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <div>
            <button
              form="add-product-form"
              type="submit"
              disabled={isSaveDisabled}
              className="h-10 px-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {createProduct.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Product'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
