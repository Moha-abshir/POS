import React, { useState } from 'react';
import { ProductList } from '../features/catalog/components/ProductList';
import { AddCategoryModal } from '../features/catalog/components/AddCategoryModal';
import { AddProductModal } from '../features/catalog/components/AddProductModal';
import { ProductHubModal } from '../features/catalog/components/ProductHubModal';
import { DetailsEditModal } from '../features/catalog/components/hub/DetailsEditModal';
import { useUpdateProduct, type Product } from '../features/catalog/api/catalog.api';
import { ImportModal } from '../components/ui/ImportModal';
import { api } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export const CatalogPage: React.FC = () => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });
  const productMode = meData?.business?.productMode || 'ADVANCED';

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();

  const handleExportProducts = async () => {
    try {
      const { data } = await api.get('/export/products', { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Products exported successfully');
    } catch (error) {
      toast.error('Failed to export products');
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const templateHeaders = [
    'Name',
    'Description',
    'Category',
    'SKU',
    'Cost Price',
    'Base Unit Name',
    'Selling Price',
    'Low Stock Threshold',
    'Initial Stock'
  ];

  const sampleRow = [
    '"Amara Body Lotion"',
    '"Hydrating skin care lotion"',
    '"Beauty"',
    '"SKU-AMARA400"',
    '250',
    '"Piece"',
    '450',
    '10',
    '50'
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-4">
      <ProductList 
        onAddProduct={() => setIsProductModalOpen(true)}
        onAddCategory={() => setIsCategoryModalOpen(true)}
        onEditProduct={(p) => setEditingProduct(p)}
        onToggleStatus={(p) => updateProduct.mutate({ id: p.id, data: { isActive: !p.isActive } })}
        onImportProducts={() => setIsImportModalOpen(true)}
        onExportProducts={handleExportProducts}
      />

      <AddCategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
      />
      
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
      />

      {productMode === 'SIMPLE' ? (
        <DetailsEditModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          product={editingProduct!}
        />
      ) : (
        <ProductHubModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
        />
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Products"
        templateHeaders={templateHeaders}
        sampleRow={sampleRow}
        importUrl="/import/products"
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};
