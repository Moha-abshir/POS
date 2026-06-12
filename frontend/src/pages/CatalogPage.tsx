import React, { useState } from 'react';
import { ProductList } from '../features/catalog/components/ProductList';
import { AddCategoryModal } from '../features/catalog/components/AddCategoryModal';
import { AddProductModal } from '../features/catalog/components/AddProductModal';
import { EditProductModal } from '../features/catalog/components/EditProductModal';
import { useToggleProductStatus, type Product } from '../features/catalog/api/catalog.api';

export const CatalogPage: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const toggleStatus = useToggleProductStatus();

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col">
      <ProductList 
        onAddProduct={() => setIsProductModalOpen(true)}
        onAddCategory={() => setIsCategoryModalOpen(true)}
        onEditProduct={(p) => setEditingProduct(p)}
        onToggleStatus={(id) => toggleStatus.mutate(id)}
      />

      <AddCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
      />
      
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
      />

      <EditProductModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
      />
    </div>
  );
};
