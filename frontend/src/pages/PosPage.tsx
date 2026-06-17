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

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);

  // Extract unique categories (mocking if category not populated)
  const categories = ['All', ...Array.from(new Set<string>(products.map((p: any) => p.category?.name || 'Uncategorized')))];

  const filteredProducts = products.filter((p: any) => {
    if (selectedCategory !== 'All' && p.category?.name !== selectedCategory && (p.category?.name || 'Uncategorized') !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="h-full w-full flex overflow-x-hidden bg-[#F7F6F4]">
      {/* Left Panel: Product Catalog (65%) */}
      <div className="flex-[6.5] flex flex-col relative h-full">
        {/* Sticky Header: Search and Categories */}
        <div className="sticky top-0 z-10 bg-[#F7F6F4] px-6 pt-6 pb-2">
          <div className="relative w-full h-[44px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-10 pr-4 bg-white border border-[#E5E1DA] rounded-xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none text-gray-900 transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-2 mt-4 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#D97706] text-white'
                    : 'bg-[#EEECE8] text-gray-600 hover:bg-[#E5E1DA]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold tracking-wider text-gray-400 mt-2 mb-1 uppercase">Products</div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-[#D97706] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p>Loading catalog...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
               <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product: any) => (
                product.variants.map((variant: any) => (
                  variant.units.map((unit: any) => (
                    <div 
                      key={unit.id}
                      onClick={() => addToCart(product, variant, unit)}
                      className="group bg-white p-3 rounded-xl border border-[#E5E1DA] shadow-sm cursor-pointer hover:shadow-md hover:border-[#D97706] transition duration-150 flex flex-col h-full relative"
                    >
                      <div className="w-full aspect-[4/3] bg-[#EEECE8] rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {/* Placeholder for image */}
                        <div className="text-gray-300">
                           <ShoppingCart className="w-8 h-8 opacity-50" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900 truncate" title={product.name}>{product.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{variant.name === 'Default' ? '' : variant.name + ' • '} {unit.name}</div>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <div className="text-sm font-semibold text-[#D97706]">
                          KSH {Number(unit.sellingPrice).toLocaleString()}
                        </div>
                        {/* Fake stock indicator dot */}
                        <div className="w-2 h-2 rounded-full bg-green-500 mb-1.5" title="In stock"></div>
                      </div>
                    </div>
                  ))
                ))
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Shopping Cart (35%, fixed, min-w-320px) */}
      <div className="flex-[3.5] min-w-[320px] bg-[#2A2926] border-l border-zinc-800 flex flex-col h-full shrink-0">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <ShoppingCart className="w-5 h-5 text-[#D97706]" />
              Current Order
            </div>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Customer</label>
            <select 
              className="w-full bg-[#F7F6F4] border border-[#E5E1DA] text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#D97706] focus:border-transparent"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Walk-in customer</option>
              <option value="new">+ Add new customer</option>
            </select>
          </div>
        </div>

        {/* Item List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#F7F6F4] rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-white mb-1">No items added yet</p>
              <p className="text-sm text-zinc-400 mb-8 max-w-[220px]">Click a product from the left to add it to this order</p>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 bg-[#F7F6F4] border border-[#E5E1DA] rounded-lg p-3 text-left">
                  <Search className="w-5 h-5 text-[#D97706] shrink-0" />
                  <p className="text-xs text-gray-600">Search by name or use category filters to find products faster</p>
                </div>
                <div className="flex items-center gap-3 bg-[#F7F6F4] border border-[#E5E1DA] rounded-lg p-3 text-left">
                  <div className="w-5 h-5 flex items-center justify-center text-[#D97706] shrink-0 border border-[#D97706] rounded-full">
                    <span className="text-[10px] font-bold">8</span>
                  </div>
                  <p className="text-xs text-gray-600">Select a customer above to attach this sale to their account</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.unitId} className="flex flex-col group">
                  <div className="flex justify-between items-start">
                    <div className="pr-2 flex-1">
                      <div className="font-medium text-white text-sm">{item.productName}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{variantNameText(item)}</div>
                    </div>
                    <div className="font-semibold text-white text-sm">
                      KSH {(item.quantity * item.sellingPrice).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateQuantity(item.unitId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-sm w-8 text-center text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.unitId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.unitId)} 
                      className="text-red-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer (Sticky) */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-400">Subtotal</span>
            <span className="text-sm text-zinc-400">KSH {cartTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-zinc-400">Discount</span>
            <span className="text-sm text-zinc-400">—</span>
          </div>
          
          <div className="flex justify-between items-end mb-6">
            <span className="text-sm font-medium text-zinc-400 mb-1">Total</span>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: '"DM Serif Display", serif' }}>
              KSH {cartTotal.toLocaleString()}
            </span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-12 bg-transparent border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent text-white font-semibold rounded-xl transition-all flex justify-center items-center gap-2"
          >
            <CreditCard className="w-5 h-5 opacity-70" /> Charge Customer
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

// Helper for displaying variant name if it's not default
function variantNameText(item: any) {
  if (item.variantName === 'Default') return item.unitName;
  return `${item.variantName} • ${item.unitName}`;
}
