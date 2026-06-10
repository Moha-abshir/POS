import React from 'react';
import { ProductList } from '../features/catalog/components/ProductList';

export const CatalogPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Catalog</h1>
        <p className="text-gray-500 mt-1">Manage categories, products, and pricing.</p>
      </div>

      <ProductList />
    </div>
  );
};
