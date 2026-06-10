import React from 'react';
import { ProductList } from '../features/catalog/components/ProductList';

export const CatalogPage: React.FC = () => {
  return (
    <div className="p-[var(--space-6)] max-w-7xl mx-auto">
      <ProductList />
    </div>
  );
};
