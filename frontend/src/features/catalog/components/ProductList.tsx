import React, { useState } from 'react';
import { useProducts } from '../api/catalog.api';
import { Package, Plus, Search, Loader2 } from 'lucide-react';

export const ProductList: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products?.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Product Catalog
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage your inventory items and prices</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Cost Price</th>
              <th className="p-4 font-medium">In Stock</th>
              <th className="p-4 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                  <p className="mt-2 text-sm">Loading products...</p>
                </td>
              </tr>
            )}
            
            {!isLoading && filteredProducts?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-900">No products found</p>
                  <p className="text-sm text-gray-500">Get started by adding a new product.</p>
                </td>
              </tr>
            )}

            {filteredProducts?.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-gray-900">{product.name}</p>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                    {product.categoryName || 'Uncategorized'}
                  </span>
                </td>
                <td className="p-4 text-gray-600 text-sm">
                  KES {parseFloat(product.costPrice).toLocaleString()}
                </td>
                <td className="p-4">
                  <span className={`text-sm font-medium ${parseFloat(product.baseStockQuantity) <= parseFloat(product.lowStockThreshold) ? 'text-red-600' : 'text-green-600'}`}>
                    {parseFloat(product.baseStockQuantity)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
