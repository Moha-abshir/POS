import React, { useState, useEffect } from 'react';
import { X, Check, Edit2, AlertTriangle, Package, DollarSign, Plus } from 'lucide-react';
import { type Product, type Variant, useUpdateProduct, useUpdateVariant } from '../api/catalog.api';
import { DetailsEditModal } from './hub/DetailsEditModal';
import { CostPriceEditModal } from './hub/CostPriceEditModal';
import { UnitPriceEditModal } from './hub/UnitPriceEditModal';
import { AddUnitModal } from './hub/AddUnitModal';
import { AddVariantModal } from './hub/AddVariantModal';
import { DeactivateConfirmModal } from './hub/DeactivateConfirmModal';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { AxiosError } from 'axios';

interface ProductHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductHubModal: React.FC<ProductHubModalProps> = ({ isOpen, onClose, product }) => {
  const updateProduct = useUpdateProduct();
  const updateVariant = useUpdateVariant();
  
  const [activeModal, setActiveModal] = useState<'details' | 'cost' | 'unit' | 'addUnit' | 'addVariant' | 'deactivate' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [isEditingLowStock, setIsEditingLowStock] = useState(false);
  const [lowStockValue, setLowStockValue] = useState('');

  useEffect(() => {
    if (isOpen && product && product.variants && product.variants.length > 0) {
      if (!selectedVariantId || !product.variants.find(v => v.id === selectedVariantId)) {
        setSelectedVariantId(product.variants[0].id);
      }
    }
    if (!isOpen) {
      setActiveModal(null);
      setSelectedUnit(null);
      setIsEditingLowStock(false);
      setLowStockValue('');
    }
  }, [isOpen, product, selectedVariantId]);

  const [lowStockError, setLowStockError] = useState('');

  if (!product) return null;

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId) || product.variants?.[0];

  const handleLowStockEdit = () => {
    if (!selectedVariant) return;
    setLowStockValue(selectedVariant.lowStockThreshold?.toString() || '0');
    setLowStockError('');
    setIsEditingLowStock(true);
  };

  const handleLowStockSave = async () => {
    if (!selectedVariant) return;
    const valueNum = Number(lowStockValue);
    if (isNaN(valueNum) || valueNum < 0) {
      setLowStockError('Threshold must be a positive number');
      return;
    }
    setLowStockError('');
    try {
      await updateVariant.mutateAsync({
        id: product.id,
        variantId: selectedVariant.id,
        data: { lowStockThreshold: valueNum }
      });
      setIsEditingLowStock(false);
    } catch (err) {
      setLowStockError((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update threshold');
    }
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className={`relative bg-[var(--color-bg-base)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-[640px] m-4 flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)] z-10">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-display tracking-tight">
                  {product.name}
                </h2>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--color-text-secondary)] font-medium">
                <span>{product.categoryName || 'Uncategorized'}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 bg-[var(--color-bg-sunken)] rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
            
            {/* DETAILS SECTION */}
            <section className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] p-5 shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                  <Package className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="text-[var(--text-sm)] font-bold uppercase tracking-wider">Product Info</h3>
                </div>
                <button 
                  onClick={() => setActiveModal('details')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-[var(--radius-md)] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-y-4 gap-x-4 text-[var(--text-sm)]">
                <div className="text-[var(--color-text-muted)] font-medium pt-2">Name</div>
                <div className="font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-sunken)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]/50">{product.name}</div>
                
                <div className="text-[var(--color-text-muted)] font-medium pt-2">Category</div>
                <div className="font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-sunken)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]/50">{product.categoryName || '-'}</div>

                <div className="text-[var(--color-text-muted)] font-medium pt-2">Description</div>
                <div className="font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-sunken)] px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]/50 min-h-[40px] leading-relaxed">{product.description || '-'}</div>
              </div>
            </section>

            {/* VARIANT SELECTOR */}
            {product.variants && (
              <section className="bg-gradient-to-r from-[var(--color-bg-surface)] to-[var(--color-bg-sunken)] rounded-[var(--radius-lg)] p-5 shadow-sm border border-[var(--color-border)] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[var(--text-sm)] font-bold text-[var(--color-text-primary)]">Variant Profile</span>
                  <span className="text-[12px] text-[var(--color-text-secondary)] font-medium mt-0.5">Select a variant to configure pricing & stock</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[220px]">
                    <CustomSelect 
                      options={product.variants.map(v => ({ id: v.id, name: v.name }))} 
                      value={selectedVariantId} 
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setActiveModal('addVariant')}
                    className="flex items-center justify-center p-2.5 text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-[var(--radius-md)] transition-colors border border-transparent hover:border-[var(--color-primary)]/30"
                    title="Add new variant"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </section>
            )}

            {selectedVariant && (
              <>
                {/* PRICING & UNITS SECTION */}
                <section className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] p-5 shadow-sm border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-[var(--color-text-primary)] mb-5">
                    <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="text-[var(--text-sm)] font-bold uppercase tracking-wider">Pricing & Units</h3>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-[var(--color-bg-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border)]/50 mb-6">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Base Cost Price</span>
                      <span className="text-lg font-bold text-[var(--color-text-primary)] mt-1">KSH {Number(selectedVariant.costPrice).toFixed(2)} <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">/ {selectedVariant.baseUnitName}</span></span>
                    </div>
                    <button 
                      onClick={() => setActiveModal('cost')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 rounded-[var(--radius-md)] shadow-sm transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Cost
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">Sales Units</h4>
                      <button 
                        onClick={() => setActiveModal('addUnit')}
                        className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Unit
                      </button>
                    </div>
                    
                    <div className="grid gap-3">
                      {selectedVariant.units?.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/30 transition-colors group">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--color-text-primary)]">{u.name}</span>
                              {u.isDefault && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded">Default</span>}
                            </div>
                            <span className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">{u.conversionFactor} × {selectedVariant.baseUnitName}</span>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Selling Price</span>
                              <span className="font-bold text-[var(--color-text-primary)]">KSH {Number(u.sellingPrice).toFixed(2)}</span>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedUnit(u);
                                setActiveModal('unit');
                              }}
                              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* STOCK SECTION */}
                <section className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] p-5 shadow-sm border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-[var(--color-text-primary)] mb-5">
                    <Package className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="text-[var(--text-sm)] font-bold uppercase tracking-wider">Inventory</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--color-bg-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border)]/50">
                      <span className="block text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Current Stock</span>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold text-[var(--color-text-primary)]">{selectedVariant.baseStockQuantity}</span>
                        <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-0.5">{selectedVariant.baseUnitName}s</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-[var(--color-bg-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border)]/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Low Stock Alert</span>
                        {!isEditingLowStock && (
                          <button onClick={handleLowStockEdit} className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {isEditingLowStock ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={lowStockValue} 
                              onChange={e => setLowStockValue(e.target.value)}
                              className="w-full h-8 px-2 text-[14px] font-medium border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                            />
                            <button onClick={handleLowStockSave} disabled={updateVariant.isPending} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingLowStock(false)} className="p-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {lowStockError && <span className="text-[12px] font-medium text-red-500">{lowStockError}</span>}
                        </div>
                      ) : (
                        <div className="flex items-end gap-2">
                          <span className="text-xl font-bold text-[var(--color-text-primary)]">{selectedVariant.lowStockThreshold}</span>
                          <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-0.5">{selectedVariant.baseUnitName}s</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* DANGER SECTION */}
            <section className="bg-red-50/50 rounded-[var(--radius-lg)] p-5 border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-[var(--text-sm)] font-bold uppercase tracking-wider">Danger Zone</h3>
              </div>
              <button 
                onClick={() => setActiveModal('deactivate')}
                className="w-full py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-[var(--radius-md)] text-[14px] font-bold shadow-sm transition-all"
              >
                {product.isActive ? 'Deactivate Product' : 'Reactivate Product'}
              </button>
            </section>

          </div>
        </div>
      </div>
      {/* Sub Modals */}
      {activeModal === 'details' && (
        <DetailsEditModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          product={product} 
        />
      )}
      {activeModal === 'cost' && selectedVariant && (
        <CostPriceEditModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          product={product} 
          variant={selectedVariant}
        />
      )}
      {activeModal === 'unit' && selectedVariant && selectedUnit && (
        <UnitPriceEditModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          product={product}
          variant={selectedVariant}
          unit={selectedUnit}
        />
      )}
      {activeModal === 'addUnit' && selectedVariant && (
        <AddUnitModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          product={product} 
          variant={selectedVariant}
        />
      )}
      {activeModal === 'addVariant' && (
        <AddVariantModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          productId={product.id}
        />
      )}

      {activeModal === 'deactivate' && (
        <DeactivateConfirmModal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          product={product} 
        />
      )}
    </>
  );
};
