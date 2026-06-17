import React from 'react';
import { X, Package, AlertTriangle, ListPlus, Check } from 'lucide-react';
import type { Product, Variant } from '../api/catalog.api';
import { useAddToRestockList, useRestockList } from '../../inventory/api/restock.api';

interface ProductRestockModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductRestockModal: React.FC<ProductRestockModalProps> = ({ product, isOpen, onClose }) => {
  const addToRestock = useAddToRestockList();
  const { data: restockList } = useRestockList();

  if (!isOpen) return null;

  const getStockStatus = (variant: Variant) => {
    const stock = Number(variant.baseStockQuantity);
    const low = Number(variant.lowStockThreshold);
    if (stock <= 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100', isLow: true };
    if (stock <= low) return { label: 'Low Stock', color: 'text-amber-600 bg-amber-100', isLow: true };
    return { label: 'Good', color: 'text-emerald-600 bg-emerald-100', isLow: false };
  };

  const isVariantInRestockList = (variantId: string) => {
    return restockList?.some((item: any) => item.variantId === variantId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              Restock: {product.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Review variants and add them to the restock queue</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {product.variants?.map((variant) => {
              const status = getStockStatus(variant);
              const isAdded = isVariantInRestockList(variant.id);
              
              return (
                <div key={variant.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.isLow ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                      {status.isLow ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{variant.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-medium text-gray-600">
                          Stock: <span className="font-bold text-gray-900">{Number(variant.baseStockQuantity)}</span> {variant.baseUnitName}s
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {isAdded ? (
                      <div className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                        <Check className="w-4 h-4" /> Added
                      </div>
                    ) : status.isLow ? (
                      <button
                        onClick={() => addToRestock.mutate(variant.id)}
                        disabled={addToRestock.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow"
                      >
                        <ListPlus className="w-4 h-4" />
                        Restock
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
