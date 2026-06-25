import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';

interface UnitSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  variant: any | null;
  onAddToCart: (product: any, variant: any, unit: any) => void;
}

export const UnitSelectionModal: React.FC<UnitSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  product, 
  variant, 
  onAddToCart 
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Reset selected unit when variant changes or modal opens
  useEffect(() => {
    if (isOpen && variant?.units?.length > 0) {
      // Default to the first unit or isDefault
      const defaultUnit = variant.units.find((u: any) => u.isDefault) || variant.units[0];
      setSelectedUnitId(defaultUnit.id);
    }
  }, [isOpen, variant]);

  if (!isOpen || !product || !variant) return null;

  const handleAdd = () => {
    if (!selectedUnitId) return;
    const unit = variant.units.find((u: any) => u.id === selectedUnitId);
    if (unit) {
      onAddToCart(product, variant, unit);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-[400px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E1DA] bg-gray-50 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {product.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{variant.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {(() => {
            const previewImage = variant.imageUrl || product.imageUrl || product.variants?.[0]?.imageUrl;
            if (!previewImage) return null;
            return (
              <div className="w-full h-36 bg-gray-50 rounded-lg overflow-hidden mb-4 border border-gray-100 flex items-center justify-center">
                <img src={previewImage} className="w-full h-full object-cover" alt={variant.name} />
              </div>
            );
          })()}
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Select Unit</h3>
          <div className="space-y-3">
            {variant.units.map((unit: any) => (
              <div 
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedUnitId === unit.id 
                    ? 'border-[#D97706] bg-amber-50 shadow-sm' 
                    : 'border-[#E5E1DA] hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedUnitId === unit.id ? 'border-[#D97706]' : 'border-gray-300'
                  }`}>
                    {selectedUnitId === unit.id && (
                      <div className="w-2 h-2 bg-[#D97706] rounded-full" />
                    )}
                  </div>
                  <span className={`font-medium ${selectedUnitId === unit.id ? 'text-[#D97706]' : 'text-gray-700'}`}>
                    {unit.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  KSH {Number(unit.sellingPrice).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#E5E1DA] bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-[#E5E1DA] rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedUnitId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-[#D97706] rounded-lg hover:bg-[#B45309] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
};
