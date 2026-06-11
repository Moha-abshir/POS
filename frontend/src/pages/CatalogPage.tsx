import React, { useState } from 'react';
import { ProductList } from '../features/catalog/components/ProductList';
import { AddCategoryModal } from '../features/catalog/components/AddCategoryModal';
import { AddProductModal } from '../features/catalog/components/AddProductModal';

export const CatalogPage: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  return (
    <div className="p-[var(--space-6)] max-w-[1400px] mx-auto h-full flex flex-col">
      <ProductList 
        onAddProduct={() => setIsProductModalOpen(true)}
        onAddCategory={() => setIsCategoryModalOpen(true)}
      />

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
