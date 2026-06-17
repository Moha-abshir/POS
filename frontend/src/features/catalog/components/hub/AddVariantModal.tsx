import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCreateVariant } from '../../api/catalog.api';
import { AxiosError } from 'axios';

interface AddVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

interface UnitRow {
  id: string;
  name: string;
  sellingPrice: string;
  conversionFactor: string;
  isDefault: boolean;
}

export const AddVariantModal: React.FC<AddVariantModalProps> = ({ isOpen, onClose, productId }) => {
  const createVariant = useCreateVariant();

  const [formData, setFormData] = useState({
    name: '',
    costPrice: '',
    baseUnitName: 'Piece',
    initialStock: '',
    lowStockThreshold: '',
  });

  const [units, setUnits] = useState<UnitRow[]>([
    { id: '1', name: 'Piece', sellingPrice: '', conversionFactor: '1', isDefault: true }
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        costPrice: '',
        baseUnitName: 'Piece',
        initialStock: '',
        lowStockThreshold: '',
      });
      setUnits([{ id: '1', name: 'Piece', sellingPrice: '', conversionFactor: '1', isDefault: true }]);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      await createVariant.mutateAsync({
        productId,
        data: {
          name: formData.name,
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
      });

      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to create variant');
    }
  };

  const cost = parseFloat(formData.costPrice) || 0;
  const hasEmptyUnits = units.some(u => !u.name || !u.sellingPrice || !u.conversionFactor);
  const hasNegativeMargins = units.some(u => {
    const sp = parseFloat(u.sellingPrice) || 0;
    const cf = parseFloat(u.conversionFactor) || 1;
    const unitCost = cost * cf;
    return cost > 0 && sp < unitCost;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Variant</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new variant and its units</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
              <div className="shrink-0 mt-0.5">⚠️</div>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form id="add-variant-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Variant Info */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                Variant Profile
              </h3>
              <div className="grid grid-cols-3 gap-5 pl-8">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Red, XL, 500ML"
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Price (KSH) *</label>
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Stock</label>
                  <input
                    type="number"
                    name="initialStock"
                    min="0"
                    value={formData.initialStock}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Low Stock Alert</label>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-mono"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Units & Pricing */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">2</span>
                  Units & Pricing
                </h3>
              </div>

              <div className="pl-8 space-y-4">
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mb-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">How units work</p>
                  <p className="text-amber-700/80">Every variant needs at least one base unit (e.g. Piece). If you sell in bulk, add larger units (e.g. Dozen = 12 Pieces). The default unit is used when adding the product to a sale.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 p-3 bg-gray-100/50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div className="w-8 text-center">Def</div>
                    <div>Unit Name</div>
                    <div>Selling Price</div>
                    <div>Qty per Base</div>
                    <div className="w-8"></div>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {units.map((unit, index) => {
                      const sp = parseFloat(unit.sellingPrice) || 0;
                      const cf = parseFloat(unit.conversionFactor) || 1;
                      const unitCost = cost * cf;
                      const margin = sp > 0 ? ((sp - unitCost) / sp) * 100 : 0;
                      const isNegative = margin < 0 && cost > 0;

                      return (
                        <div key={unit.id} className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 p-3 items-start transition-colors ${isNegative ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
                          <div className="w-8 flex justify-center pt-2.5">
                            <input 
                              type="radio" 
                              name="defaultUnit" 
                              checked={unit.isDefault}
                              onChange={() => handleSetDefaultUnit(unit.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={unit.name}
                              onChange={(e) => {
                                handleUnitChange(unit.id, 'name', e.target.value);
                                if (index === 0) setFormData(prev => ({...prev, baseUnitName: e.target.value}));
                              }}
                              placeholder={index === 0 ? "e.g. Piece" : "e.g. Dozen"}
                              required
                              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                            />
                            {index === 0 && <span className="text-[10px] text-gray-400 mt-1 block font-medium uppercase tracking-wider">Base Unit</span>}
                          </div>
                          
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={unit.sellingPrice}
                              onChange={(e) => handleUnitChange(unit.id, 'sellingPrice', e.target.value)}
                              placeholder="0.00"
                              required
                              className={`w-full bg-white border text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm font-mono ${isNegative ? 'border-red-300 text-red-900' : 'border-gray-200 text-gray-900'}`}
                            />
                            {cost > 0 && sp > 0 && (
                              <div className={`text-[11px] mt-1.5 font-medium ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                                Margin: {margin.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={unit.conversionFactor}
                              onChange={(e) => handleUnitChange(unit.id, 'conversionFactor', e.target.value)}
                              readOnly={index === 0}
                              required
                              className={`w-full text-sm rounded-lg px-3 py-2 outline-none shadow-sm font-mono ${index === 0 ? 'bg-gray-100 border-transparent text-gray-500' : 'bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                            />
                            {index > 0 && <span className="text-[10px] text-gray-400 mt-1 block truncate">1 {unit.name || 'Unit'} = {unit.conversionFactor || '?'} {units[0].name || 'Base'}</span>}
                          </div>
                          
                          <div className="w-8 flex justify-center pt-1.5">
                            <button
                              type="button"
                              onClick={() => removeUnitRow(unit.id)}
                              disabled={units.length === 1}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addUnitRow}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Unit
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-variant-form"
            disabled={createVariant.isPending || hasEmptyUnits || hasNegativeMargins}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm hover:shadow"
          >
            {createVariant.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {createVariant.isPending ? 'Creating...' : 'Create Variant'}
          </button>
        </div>
      </div>
    </div>
  );
};
