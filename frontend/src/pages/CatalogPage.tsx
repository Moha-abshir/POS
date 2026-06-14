import React, { useState } from 'react';
import { ProductList } from '../features/catalog/components/ProductList';
import { AddCategoryModal } from '../features/catalog/components/AddCategoryModal';
import { AddProductModal } from '../features/catalog/components/AddProductModal';
import { ProductHubModal } from '../features/catalog/components/ProductHubModal';
import { useUpdateProduct, type Product } from '../features/catalog/api/catalog.api';

export const CatalogPage: React.FC = () => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const updateProduct = useUpdateProduct();

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col">
      <ProductList 
        onAddProduct={() => setIsProductModalOpen(true)}
        onAddCategory={() => setIsCategoryModalOpen(true)}
        onEditProduct={(p) => setEditingProduct(p)}
        onToggleStatus={(p) => updateProduct.mutate({ id: p.id, data: { isActive: !p.isActive } })}
      />

      <AddCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
      />
      
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
      />

      <ProductHubModal
        isOpen={!!editingProduct}
        onClose={() => {
          setEditingProduct(null);
        }}
        product={editingProduct}
      />
    </div>
  );
};
