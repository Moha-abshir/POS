import React, { useState } from 'react';
import { useProducts, useCategories } from '../api/catalog.api';
import { Package, Plus, Search, Loader2, MoreHorizontal} from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';

interface ProductListProps {
  onAddProduct: () => void;
  onAddCategory: () => void;
  onEditProduct: (product: any) => void;
  onToggleStatus: (product: any) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onAddProduct, onAddCategory, onEditProduct, onToggleStatus }) => {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
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
      matchesStatus = parseFloat(p.baseStockQuantity) <= parseFloat(p.lowStockThreshold);
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
      <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Search - exactly 50% width on desktop */}
        <div className="relative w-full sm:w-1/2 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products by name or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[var(--color-bg-sunken)] border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-transparent focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Filters and Actions - takes remaining 50% */}
        <div className="flex items-center gap-3 w-full sm:flex-1 shrink-0 flex-wrap sm:flex-nowrap">
          
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Category:</span>
            <div className="flex-1 min-w-[120px]">
              <CustomSelect 
                label="Category" 
                options={categories ? [{ id: '', name: 'All' }, ...categories.map(c => ({ id: c.id, name: c.name }))] : [{ id: '', name: 'All' }]} 
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
            <div className="flex-1 min-w-[120px]">
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
            
            {!isLoading && filteredProducts?.length === 0 && (
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
              const stock = parseFloat(product.baseStockQuantity);
              const threshold = parseFloat(product.lowStockThreshold);
              
              let stockStatus = 'Good';
              let badgeColor = 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
              
              if (stock <= 0) {
                stockStatus = 'Out';
                badgeColor = 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]';
              } else if (stock <= threshold) {
                stockStatus = 'Low';
                badgeColor = 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
              }

              return (
                <tr 
                  key={product.id} 
                  className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}
                >
                  <td className="px-6 py-0 w-16">
                    <div className="h-8 w-8 bg-gray-200 rounded-[var(--radius-sm)] flex items-center justify-center text-gray-400 text-[10px] font-medium uppercase">
                      Img
                    </div>
                  </td>
                  <td className="px-6 py-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">KSH {parseFloat(product.costPrice).toLocaleString()} cost</p>
                  </td>
                  <td className="px-6 py-0">
                    <span className="text-sm text-gray-500">
                      {product.categoryName || 'Uncat.'}
                    </span>
                  </td>
                  <td className="px-6 py-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono text-[var(--color-text-primary)] min-w-[3rem] text-right">{stock}</p>
                      <span className={`inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {stockStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-0 text-right">
                    <div className="flex items-center justify-end gap-3 relative">
                      <button onClick={() => onEditProduct(product)} className="text-amber-600 font-medium text-sm hover:underline outline-none focus:ring-2 focus:ring-amber-500 rounded px-1">
                        Edit
                      </button>
                      <button aria-label="More options" onClick={() => setActiveDropdown(activeDropdown === product.id ? null : product.id)} className="text-gray-400 hover:text-gray-600 transition-colors outline-none focus:ring-2 focus:ring-amber-500 rounded p-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeDropdown === product.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
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
    </div>
  );
};
