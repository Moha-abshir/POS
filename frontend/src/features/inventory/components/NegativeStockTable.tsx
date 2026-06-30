import React, { useState } from 'react';
import { useProducts } from '../../catalog/api/catalog.api';
import { AlertCircle, Wrench, PlusCircle, Search, Package } from 'lucide-react';
import { AdjustStockModal } from './AdjustStockModal';
import { PurchaseModal } from './PurchaseModal';
import { useAuthStore } from '../../auth/stores/auth.store';

export function NegativeStockTable() {
  const { data: products = [], isLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustVariantId, setAdjustVariantId] = useState<string | null>(null);
  const [purchaseVariantId, setPurchaseVariantId] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  // Flatten products to variants
  const variants = products.flatMap(p => 
    (p.variants || []).map(v => ({
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      variantName: v.name,
      sku: v.sku || '-',
      baseStockQuantity: Number(v.baseStockQuantity),
      baseUnitName: v.baseUnitName
    }))
  );

  // Filter out non-negative stocks
  const negativeVariants = variants.filter(v => 
    v.baseStockQuantity < 0 && (
      v.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.variantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden relative">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-white">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search negative items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading negative inventory list...</div>
        ) : negativeVariants.length === 0 ? (
          <div className="p-16 text-center animate-in fade-in duration-200">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
              <Package className="h-12 w-12 text-emerald-500 mb-4" />
              <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">All stocks are clear</p>
              <p className="text-sm text-[var(--color-text-secondary)]">No products currently have negative stock levels.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-[var(--color-border)]">
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Product</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">SKU</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Current Stock</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {negativeVariants.map((item, index) => (
                <tr key={item.variantId} className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-base)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]/20'}`}>
                  <td className="px-6 py-2 font-semibold text-sm text-[var(--color-text-primary)]">
                    {item.productName}
                    {item.variantName && <span className="text-[var(--color-text-muted)] font-normal text-xs ml-1.5">({item.variantName})</span>}
                  </td>
                  <td className="px-6 py-2 text-sm text-[var(--color-text-secondary)]">
                    {item.sku}
                  </td>
                  <td className="px-6 py-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                      <AlertCircle size={14} />
                      {item.baseStockQuantity} {item.baseUnitName}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      {currentUser?.role !== 'CASHIER' && (
                        <>
                          <button
                            onClick={() => setPurchaseVariantId(item.variantId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md transition-all shadow-sm select-none cursor-pointer hover:shadow-md"
                          >
                            <PlusCircle size={14} />
                            <span>Log Purchase</span>
                          </button>
                          <button
                            onClick={() => setAdjustVariantId(item.variantId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-md transition-all shadow-sm select-none cursor-pointer hover:shadow-md"
                          >
                            <Wrench size={14} />
                            <span>Adjust Stock</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjustVariantId && (
        <AdjustStockModal 
          initialVariantId={adjustVariantId} 
          onClose={() => setAdjustVariantId(null)} 
        />
      )}

      {purchaseVariantId && (
        <PurchaseModal 
          initialVariantId={purchaseVariantId} 
          onClose={() => setPurchaseVariantId(null)} 
        />
      )}
    </div>
  );
}
