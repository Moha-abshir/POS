import React, { useState } from 'react';
import { useProducts, useCategories } from '../api/catalog.api';
import { Package, Plus, Search, Loader2, MoreHorizontal } from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { ProductRestockModal } from './ProductRestockModal';

interface ProductListProps {
  onAddProduct: () => void;
  onAddCategory: () => void;
  onEditProduct: (product: any) => void;
  onToggleStatus: (product: any) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onAddProduct, onAddCategory, onEditProduct, onToggleStatus }) => {
  const { data: products, isLoading, isError } = useProducts();
  const { data: categories, isError: isCategoriesError } = useCategories();
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
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
      matchesStatus = p.isActive === true;
    } else if (selectedStatus === 'inactive') {
      matchesStatus = p.isActive === false;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col h-full flex-1">
      
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
        <div className="flex items-center gap-3 w-full xl:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Category:</span>
            <div className="flex-1 min-w-[160px]">
              <CustomSelect 
                label="Category" 
                options={isCategoriesError ? [{ id: '', name: 'Error loading categories' }] : categories ? [{ id: '', name: 'All' }, ...categories.map(c => ({ id: c.id, name: c.name }))] : [{ id: '', name: 'All' }]} 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                onActionClick={onAddCategory}
                actionLabel="New Category"
                className="w-full bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Status:</span>
            <div className="flex-1 min-w-[140px]">
              <CustomSelect 
                label="Status" 
                options={[{ id: '', name: 'All' }, ...statusOptions]} 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white"
              />
            </div>
          </div>

          <button 
            onClick={onAddProduct}
            className="flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 h-10 rounded-[var(--radius-md)] font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 shrink-0 select-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-[var(--color-border)]">
              <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Image</th>
              <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Name</th>
              <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Cat.</th>
              <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Stock</th>
              <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500" />
                  <p className="mt-2 text-sm font-medium">Loading inventory...</p>
                </td>
              </tr>
            )}
            
            {isError && (
              <tr>
                <td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <p className="text-red-500 font-semibold mb-2">Failed to load inventory.</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-amber-600 hover:underline font-medium text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !isError && filteredProducts?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-16">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
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
                </td>
              </tr>
            )}

            {filteredProducts?.map((product, index) => {
              const primaryVariant = product.variants?.[0];
              const totalStock = product.variants?.reduce((sum, v) => sum + parseFloat(v.baseStockQuantity as string), 0) || 0;
              const hasMultipleVariants = (product.variants?.length || 0) > 1;
              const costPriceLabel = hasMultipleVariants ? 'Multiple Variants' : `KSH ${parseFloat(primaryVariant?.costPrice as string || '0').toLocaleString()}`;
              
              let stockStatus = 'Good';
              let badgeColor = 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
              
              const isOut = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= 0);
              const isLow = product.variants?.some(v => parseFloat(v.baseStockQuantity as string) <= parseFloat(v.lowStockThreshold as string));

              if (isOut) {
                stockStatus = 'Out';
                badgeColor = 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]';
              } else if (isLow) {
                stockStatus = 'Low';
                badgeColor = 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
              }

              return (
                <tr 
                  key={product.id} 
                  onClick={() => setRestockProduct(product)}
                  className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}
                >
                  <td className="px-6 py-0 w-16">
                    <div className="h-8 w-8 bg-gray-200 rounded-[var(--radius-sm)] flex items-center justify-center text-gray-400 text-[10px] font-medium uppercase relative">
                      Img
                      {(isLow || isOut) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white">
                          <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight">{product.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{costPriceLabel}</p>
                  </td>
                  <td className="px-6 py-0">
                    <span className="text-sm text-gray-500">
                      {product.categoryName || 'Uncat.'}
                    </span>
                  </td>
                  <td className="px-6 py-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono text-[var(--color-text-primary)] min-w-[3rem] text-right">{totalStock}</p>
                      <span className={`inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {stockStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-0 text-right">
                    <div className="flex items-center justify-end gap-3 relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditProduct(product); }} 
                        className="text-amber-600 font-medium text-sm hover:underline outline-none focus:ring-2 focus:ring-amber-500 rounded px-1"
                      >
                        Edit
                      </button>
                      <button 
                        aria-label="More options" 
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === product.id ? null : product.id); }} 
                        className="text-gray-400 hover:text-gray-600 transition-colors outline-none focus:ring-2 focus:ring-amber-500 rounded p-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeDropdown === product.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }} />
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg z-20 py-1">
                            <button
                              onClick={() => {
                                setActiveDropdown(null);
                                onToggleStatus(product);
                              }}
                              className="w-full text-left px-4 py-2 text-[var(--text-sm)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                            >
                              {product.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
