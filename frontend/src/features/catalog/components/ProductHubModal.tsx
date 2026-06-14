import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { type Product, type Variant, useUpdateProduct, useUpdateVariant } from '../api/catalog.api';
import { DetailsEditModal } from './hub/DetailsEditModal';
import { CostPriceEditModal } from './hub/CostPriceEditModal';
import { UnitPriceEditModal } from './hub/UnitPriceEditModal';
import { AddUnitModal } from './hub/AddUnitModal';
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
  
  const [activeModal, setActiveModal] = useState<'details' | 'cost' | 'unit' | 'addUnit' | 'deactivate' | null>(null);
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

  if (!product) return null;

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId) || product.variants?.[0];

  const [lowStockError, setLowStockError] = useState('');

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
        
        <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[600px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
                {product.name}
              </h2>
              <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">—</span>
              <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">{product.categoryName || 'No Category'}</span>
              <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">•</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
            
            {/* DETAILS SECTION */}
            <section>
              <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-2">
                <h3 className="text-[var(--text-sm)] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">Product Details</h3>
                <button 
                  onClick={() => setActiveModal('details')}
                  className="text-[var(--text-sm)] font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                >
                  Edit ✎
                </button>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-3 text-[var(--text-sm)]">
                <div className="text-[var(--color-text-muted)]">Name</div>
                <div className="font-medium text-[var(--color-text-primary)]">{product.name}</div>
                
                <div className="text-[var(--color-text-muted)]">Category</div>
                <div className="font-medium text-[var(--color-text-primary)]">{product.categoryName || '-'}</div>

                <div className="text-[var(--color-text-muted)]">Description</div>
                <div className="font-medium text-[var(--color-text-primary)]">{product.description || '-'}</div>
              </div>
            </section>

            {/* VARIANT SELECTOR */}
            {product.variants && product.variants.length > 0 && (
              <section className="bg-[var(--color-bg-sunken)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-sm)] font-semibold text-[var(--color-text-secondary)]">Managing Variant:</span>
                  <div className="w-[200px]">
                    <CustomSelect 
                      options={product.variants.map(v => ({ id: v.id, name: v.name }))} 
                      value={selectedVariantId} 
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}

            {selectedVariant && (
              <>
                {/* PRICING & UNITS SECTION */}
                <section>
                  <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-2">
                    <h3 className="text-[var(--text-sm)] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">Pricing & Units</h3>
                  </div>
                  
                  <div className="grid grid-cols-[150px_1fr_auto] gap-3 text-[var(--text-sm)] items-center mb-6">
                    <div className="text-[var(--color-text-muted)]">Base Cost Price</div>
                    <div className="font-medium text-[var(--color-text-primary)]">KSH {Number(selectedVariant.costPrice).toFixed(2)} / {selectedVariant.baseUnitName}</div>
                    <button 
                      onClick={() => setActiveModal('cost')}
                      className="text-[var(--text-sm)] font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                    >
                      Edit ✎
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">Sales Units:</div>
                    
                    {selectedVariant.units?.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                            {u.name} 
                            {u.isDefault && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">Default</span>}
                          </span>
                          <span className="text-[12px] text-[var(--color-text-muted)]">{u.conversionFactor} x {selectedVariant.baseUnitName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-[var(--color-text-primary)]">KSH {Number(u.sellingPrice).toFixed(2)}</span>
                          <button 
                            onClick={() => {
                              setSelectedUnit(u);
                              setActiveModal('unit');
                            }}
                            className="text-[13px] font-medium text-[var(--color-primary)] hover:underline"
                          >
                            [Edit]
                          </button>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={() => setActiveModal('addUnit')}
                      className="w-full py-2 border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                    >
                      + Add Unit
                    </button>
                  </div>
                </section>

                {/* STOCK SECTION */}
                <section>
                  <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-2">
                    <h3 className="text-[var(--text-sm)] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">Stock</h3>
                  </div>
                  <div className="grid grid-cols-[150px_1fr_auto] gap-4 text-[var(--text-sm)] items-center">
                    <div className="text-[var(--color-text-muted)]">Current Stock</div>
                    <div className="font-medium text-[var(--color-text-primary)]">{selectedVariant.baseStockQuantity} {selectedVariant.baseUnitName}s</div>
                    <div className="text-[12px] italic text-[var(--color-text-muted)]">(read-only)</div>
                    
                    <div className="text-[var(--color-text-muted)]">Low Stock Alert</div>
                    <div className="font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                      {isEditingLowStock ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={lowStockValue} 
                              onChange={e => setLowStockValue(e.target.value)}
                              className="w-20 h-8 px-2 border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            <button onClick={handleLowStockSave} disabled={updateVariant.isPending} className="text-green-600 hover:text-green-700">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingLowStock(false)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {lowStockError && <span className="text-[12px] text-red-500">{lowStockError}</span>}
                        </div>
                      ) : (
                        <>
                          <span>below {selectedVariant.lowStockThreshold} {selectedVariant.baseUnitName}s</span>
                          <button 
                            onClick={handleLowStockEdit}
                            className="text-[var(--text-sm)] font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors ml-4"
                          >
                            Edit ✎
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* DANGER SECTION */}
            <section>
              <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-2">
                <h3 className="text-[var(--text-sm)] font-bold tracking-wider text-red-500 uppercase">Danger</h3>
              </div>
              <button 
                onClick={() => setActiveModal('deactivate')}
                className="w-full py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium transition-colors"
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
