import React, { useState } from 'react';
import { useProducts, useCategories } from '../api/catalog.api';
import { Package, Plus, Search, Loader2, Upload, Download } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { TableSkeleton } from '../../../components/ui/Loading';
import { ProductRestockModal } from './ProductRestockModal';
import { useAuthStore } from '../../auth/stores/auth.store';

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
          
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden h-[260px] md:h-[380px] flex flex-col">
                <div className="bg-gray-100 h-1/2 w-full animate-pulse"></div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-5 bg-gray-100 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                  </div>
                  <div className="flex gap-3 mt-auto">
                    <div className="h-9 bg-gray-100 rounded-lg flex-1"></div>
                    <div className="h-9 bg-gray-100 rounded-lg w-9"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {filteredProducts.map((product) => {
              const primaryVariant = product.variants?.[0];
              const totalStock = product.variants?.reduce((sum, v) => sum + parseFloat(v.baseStockQuantity as string), 0) || 0;
              const hasMultipleVariants = (product.variants?.length || 0) > 1;
              const defaultUnit = primaryVariant?.units?.find((u: any) => u.isDefault) || primaryVariant?.units?.[0];
              const priceLabel = hasMultipleVariants ? 'Multiple Variants' : `KSH ${parseFloat(defaultUnit?.sellingPrice as string || '0').toLocaleString()}`;
              
              let stockStatus = 'Good';
              let badgeColor = 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
              
              const isOut = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= 0);
              const isLow = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= parseFloat(v.lowStockThreshold as string));
              const hasInactiveVariant = product.variants?.some(v => v.isActive === false);

              if (hasInactiveVariant) {
                stockStatus = 'Inactive Var';
                badgeColor = 'bg-gray-100 text-gray-500 border-gray-200';
              } else if (isOut) {
                stockStatus = 'Out';
                badgeColor = 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]';
              } else if (isLow) {
                stockStatus = 'Low';
                badgeColor = 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
              }

              const variantWithImage = product.variants?.find((v: any) => v.imageUrl);
              const displayImage = product.imageUrl || variantWithImage?.imageUrl || product.variants?.[0]?.imageUrl;

              return (
                <div 
                  key={product.id}
                  onClick={() => setRestockProduct(product)}
                  className="group bg-white rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all duration-200 flex flex-col overflow-hidden h-[280px] md:h-[380px] relative cursor-pointer"
                >
                  {/* Image: exactly 50% height */}
                  <div className="w-full h-1/2 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 relative shrink-0">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                        alt={product.name} 
                      />
                    ) : (
                      <Package className="w-12 h-12 text-gray-300 group-hover:scale-105 transition-all duration-300" />
                    )}
                    
                    {/* Status badge overlaid on image */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white/20 ${badgeColor}`}>
                        {stockStatus}
                      </span>
                    </div>

                    {/* Stock count overlaid on bottom right of the image */}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] font-mono font-bold">
                      {totalStock} in stock
                    </div>
                  </div>

                  {/* Details: 50% height */}
                  <div className="p-3 md:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[9px] md:text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider line-clamp-1">
                          {product.categoryName || 'Unclassified'}
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-bold text-[var(--color-text-primary)] mt-1.5 md:mt-2 group-hover:text-amber-600 transition-colors line-clamp-2" title={product.name}>
                        {product.name}
                      </h4>
                      <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-semibold">
                        {priceLabel}
                      </p>
                    </div>

                    {/* Action buttons at the bottom of the card */}
                    <div className="flex items-center justify-between pt-2.5 md:pt-3 border-t border-gray-100 mt-auto gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEditProduct(product)}
                        className="w-full h-8 md:h-9 flex items-center justify-center text-[10px] md:text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200/50 cursor-pointer"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
