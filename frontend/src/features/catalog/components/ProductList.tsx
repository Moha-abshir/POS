import React, { useState } from 'react';
import { useProducts } from '../api/catalog.api';
import { Package, Plus, Search, Loader2, MoreHorizontal } from 'lucide-react';

export const ProductList: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products?.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden">
      
      {/* Header Bar */}
      <div className="p-[var(--space-4)] border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        <div className="flex w-full sm:w-auto items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] outline-none transition-all placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)]"
            />
          </div>
          {/* Mock filters for visual completeness per design */}
          <select className="h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-sm)] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)] hidden sm:block">
            <option>Category: All</option>
          </select>
          <select className="h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-sm)] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)] hidden sm:block">
            <option>Status: Active</option>
          </select>
        </div>

        <button className="flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 h-10 rounded-[var(--radius-md)] font-semibold transition-colors shrink-0">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-base)] text-[var(--color-text-muted)] text-[var(--text-xs)] uppercase tracking-widest font-medium border-b border-[var(--color-border-strong)]">
              <th scope="col" className="px-6 py-3">Image</th>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Cat.</th>
              <th scope="col" className="px-6 py-3">Stock</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[var(--color-text-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--color-accent)]" />
                  <p className="mt-2 text-[var(--text-sm)]">Loading products...</p>
                </td>
              </tr>
            )}
            
            {!isLoading && filteredProducts?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-16 text-center">
                  <Package className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-3 opacity-50" />
                  <p className="text-[var(--text-lg)] font-semibold text-[var(--color-text-secondary)]">No products found</p>
                  <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mt-1 mb-4">Get started by adding a new product to your inventory.</p>
                  <button className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 h-10 rounded-[var(--radius-md)] font-semibold transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                </td>
              </tr>
            )}

            {filteredProducts?.map((product) => {
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
                <tr key={product.id} className="border-b border-[var(--color-border)] even:bg-[var(--color-bg-sunken)] hover:bg-[var(--color-bg-sunken)] transition-colors duration-100">
                  <td className="px-6 py-4 w-16">
                    <div className="h-10 w-10 bg-gray-200 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--color-text-muted)] text-[var(--text-xs)]">
                      Img
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">{product.name}</p>
                    <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] mt-0.5">KES {parseFloat(product.costPrice).toLocaleString()} cost</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                      {product.categoryName ? product.categoryName.substring(0, 4) + '.' : 'Uncat.'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[var(--text-sm)] font-mono text-[var(--color-text-primary)]">{stock}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-medium mt-1 whitespace-nowrap ${badgeColor}`}>
                      {stockStatus === 'Good' ? '✓' : stockStatus === 'Low' ? '⚠' : '✕'} {stockStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-[var(--color-accent)] font-medium text-[var(--text-sm)] hover:underline outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded">
                        Edit
                      </button>
                      <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded">
                        <MoreHorizontal className="h-5 w-5" />
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
  );
};
