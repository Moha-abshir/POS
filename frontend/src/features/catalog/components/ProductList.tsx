import React, { useState } from 'react';
import { useProducts, useCategories } from '../api/catalog.api';
import { Package, Plus, Search, Loader2, Upload, Download } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { TableSkeleton } from '../../../components/ui/Loading';
import { ProductRestockModal } from './ProductRestockModal';
import { useAuthStore } from '../../auth/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface ProductListProps {
  onAddProduct: () => void;
  onAddCategory: () => void;
  onEditProduct: (product: any) => void;
  onToggleStatus: (product: any) => void;
  onImportProducts?: () => void;
  onExportProducts?: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  onAddProduct, 
  onAddCategory, 
  onEditProduct, 
  onToggleStatus,
  onImportProducts,
  onExportProducts
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { data: products, isLoading, isError } = useProducts();
  const { data: categories, isError: isCategoriesError } = useCategories();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });
  const productMode = meData?.business?.productMode || 'ADVANCED';
  
  const [restockProduct, setRestockProduct] = useState<any | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
    { id: 'low_stock', name: 'Low Stock' },
  ];

  const filteredProducts = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    
    let matchesStatus = true;
    if (selectedStatus === 'low_stock') {
      matchesStatus = p.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= parseFloat(v.lowStockThreshold as string)) || false;
    } else if (selectedStatus === 'active') {
      matchesStatus = p.variants?.some(v => v.isActive === true) || p.isActive === true;
    } else if (selectedStatus === 'inactive') {
      matchesStatus = p.variants?.some(v => v.isActive === false) || p.isActive === false;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-visible md:overflow-hidden flex flex-col h-auto md:h-full flex-1">
      
      {/* Toolbar Row */}
      <div className="p-4 border-b border-[var(--color-border)] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        
        {/* Search */}
        <div className="relative w-full xl:max-w-[320px] min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products by name or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[var(--color-bg-sunken)] border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-transparent focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
          
          <div className={`${productMode === 'SIMPLE' ? 'flex' : 'grid grid-cols-2 sm:flex'} items-center gap-2 w-full sm:w-auto`}>
            {productMode !== 'SIMPLE' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Category:</span>
                <div className="w-full sm:w-40 min-w-[120px]">
                  <CustomSelect 
                    label="Category" 
                    options={isCategoriesError ? [{ id: '', name: 'Error' }] : categories ? [{ id: '', name: 'All' }, ...categories.map(c => ({ id: c.id, name: c.name }))] : [{ id: '', name: 'All' }]} 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    onActionClick={onAddCategory}
                    actionLabel="New Category"
                    className="w-full bg-white text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Status:</span>
              <div className="w-full sm:w-32 min-w-[100px]">
                <CustomSelect 
                  label="Status" 
                  options={[{ id: '', name: 'All' }, ...statusOptions]} 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {currentUser?.role !== 'CASHIER' && onImportProducts && (
              <button 
                onClick={onImportProducts}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 h-10 rounded-[var(--radius-md)] text-sm font-semibold transition-all select-none cursor-pointer"
              >
                <Download size={16} />
                <span>Import</span>
              </button>
            )}

            {onExportProducts && (
              <button 
                onClick={onExportProducts}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 h-10 rounded-[var(--radius-md)] text-sm font-semibold transition-all select-none cursor-pointer"
              >
                <Upload size={16} />
                <span>Export</span>
              </button>
            )}
          </div>

          {currentUser?.role !== 'CASHIER' && (
            <button 
              onClick={onAddProduct}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 h-10 rounded-[var(--radius-md)] text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer mt-2 sm:mt-0"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-visible md:overflow-y-auto flex-1 p-4 md:p-6">
        {isLoading && (
          <TableSkeleton rows={8} cols={7} />
        )}
        
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
            <p className="text-red-500 font-semibold mb-2">Failed to load inventory.</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-amber-600 hover:underline font-medium text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredProducts?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
            <Package className="h-12 w-12 text-gray-300 mb-4" fill="currentColor" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-gray-500 mb-1">No products yet</h3>
            <p className="text-sm text-gray-400 mb-6">
              {searchTerm || selectedCategory ? 'No products match your current filters.' : 'Add your first product to start tracking inventory.'}
            </p>
            <button 
              onClick={onAddProduct}
              className="inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 h-10 rounded-[var(--radius-md)] font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredProducts && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
                <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-4">Product Info</th>
                    {productMode !== 'SIMPLE' && <th className="px-5 py-4">Category</th>}
                    {productMode !== 'SIMPLE' && <th className="px-5 py-4 text-center">Variants</th>}
                    <th className="px-5 py-4 text-right">Price / Range</th>
                    <th className="px-5 py-4 text-right">Total Stock</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700">
                  {filteredProducts.map((product) => {
                    const primaryVariant = product.variants?.[0];
                    const totalStock = product.variants?.reduce((sum, v) => sum + parseFloat(v.baseStockQuantity as string), 0) || 0;
                    const hasMultipleVariants = (product.variants?.length || 0) > 1;
                    const defaultUnit = primaryVariant?.units?.find((u: any) => u.isDefault) || primaryVariant?.units?.[0];
                    const priceLabel = hasMultipleVariants ? 'Multiple Variants' : `KSH ${parseFloat(defaultUnit?.sellingPrice as string || '0').toLocaleString()}`;
                    
                    let stockStatus = 'Good';
                    let badgeColor = 'bg-green-50 text-green-700 border-green-100';
                    
                    const isOut = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= 0);
                    const isLow = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= parseFloat(v.lowStockThreshold as string));
                    const hasInactiveVariant = product.variants?.some(v => v.isActive === false);

                    if (hasInactiveVariant) {
                      stockStatus = 'Inactive';
                      badgeColor = 'bg-gray-50 text-gray-500 border-gray-100';
                    } else if (isOut) {
                      stockStatus = 'Out of Stock';
                      badgeColor = 'bg-red-50 text-red-700 border-red-100';
                    } else if (isLow) {
                      stockStatus = 'Low Stock';
                      badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    }

                    const variantWithImage = product.variants?.find((v: any) => v.imageUrl);
                    const displayImage = product.imageUrl || variantWithImage?.imageUrl || product.variants?.[0]?.imageUrl;

                    return (
                      <tr 
                        key={product.id}
                        onClick={() => setRestockProduct(product)}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                            {displayImage ? (
                              <img src={displayImage} className="w-full h-full object-cover" alt={product.name} />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{product.name}</div>
                            {primaryVariant?.sku && <div className="text-[10px] text-gray-400 font-semibold mt-0.5">SKU: {primaryVariant.sku}</div>}
                          </div>
                        </td>
                        {productMode !== 'SIMPLE' && (
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 uppercase tracking-wider">
                              {product.categoryName || 'Unclassified'}
                            </span>
                          </td>
                        )}
                        {productMode !== 'SIMPLE' && (
                          <td className="px-5 py-3 text-center font-semibold text-gray-800">
                            {product.variants?.length || 0}
                          </td>
                        )}
                        <td className="px-5 py-3 text-right font-bold text-gray-900">
                          {priceLabel}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-gray-900">
                          {totalStock.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {stockStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => onEditProduct(product)}
                              className="px-3 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-200/50 cursor-pointer"
                            >
                              Edit Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {restockProduct && (
        <ProductRestockModal
          product={restockProduct}
          isOpen={true}
          onClose={() => setRestockProduct(null)}
        />
      )}
    </div>
  );
};
