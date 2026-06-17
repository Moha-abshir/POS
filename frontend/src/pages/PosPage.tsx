import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Search, CreditCard, Banknote, Plus, Minus, X } from 'lucide-react';
import { api } from '../lib/api';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';

// TODO: Replace with proper catalog API hook if available
const usePosCatalog = (search?: string) => {
  return useQuery({
    queryKey: ['pos-catalog', search],
    queryFn: async () => {
      const { data } = await api.get('/catalog/products', { params: { search, limit: 100 } });
      return data;
    }
  });
};

export const PosPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { data: catalogData, isLoading } = usePosCatalog(searchTerm);
  const products = catalogData?.data || [];

  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (product: any, variant: any, unit: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.unitId === unit.id);
      if (existing) {
        return prev.map((item) => 
          item.unitId === unit.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        unitId: unit.id,
        unitName: unit.name,
        quantity: 1,
        sellingPrice: Number(unit.sellingPrice),
      }];
    });
  };

  const updateQuantity = (unitId: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.unitId === unitId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (unitId: string) => {
    setCart((prev) => prev.filter(item => item.unitId !== unitId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex -m-6"> {/* Negative margin to fill dashboard layout padding */}
      {/* Left Side: Product Catalog */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading catalog...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => (
              product.variants.map((variant: any) => (
                variant.units.map((unit: any) => (
                  <div 
                    key={unit.id}
                    onClick={() => addToCart(product, variant, unit)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all flex flex-col h-full"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 mb-2">{variant.name} - {unit.name}</div>
                    </div>
                    <div className="font-bold text-indigo-600">
                      KSh {Number(unit.sellingPrice).toLocaleString()}
                    </div>
                  </div>
                ))
              ))
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Shopping Cart */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Current Order</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-3 text-gray-200" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.unitId} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900 text-sm leading-tight">{item.productName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.variantName} ({item.unitName})</div>
                  </div>
                  <button onClick={() => removeFromCart(item.unitId)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="font-bold text-gray-900">
                    KSh {(item.quantity * item.sellingPrice).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-md p-1">
                    <button 
                      onClick={() => updateQuantity(item.unitId, -1)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.unitId, 1)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-gray-900">KSh {cartTotal.toLocaleString()}</span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
          >
            Checkout <CreditCard className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalAmount={cartTotal}
        onSuccess={() => setCart([])}
      />
    </div>
  );
};
