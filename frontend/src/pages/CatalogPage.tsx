import React, { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { ProductList } from '../features/catalog/components/ProductList';
import { AddCategoryModal } from '../features/catalog/components/AddCategoryModal';
import { AddProductModal } from '../features/catalog/components/AddProductModal';

export const CatalogPage: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  return (
    <div className="p-[var(--space-6)] max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[var(--text-xl)] font-bold text-[var(--color-text-primary)] tracking-tight">
            Product Catalog
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Manage your store's inventory, pricing, and categories.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer select-none"
          >
            <Tags className="w-4 h-4" />
            New Category
          </button>
          <button 
            onClick={() => setIsProductModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-5 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all cursor-pointer select-none shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <ProductList />

      <AddCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
      />
      
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
      />
    </div>
  );
};
