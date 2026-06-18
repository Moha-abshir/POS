import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Search, CreditCard, Banknote, Plus, Minus, X } from 'lucide-react';
import { api } from '../lib/api';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';
import { UnitSelectionModal } from '../features/sales/components/UnitSelectionModal';

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
  const [selectingUnitFor, setSelectingUnitFor] = useState<{product: any, variant: any} | null>(null);

  const handleVariantClick = (product: any, variant: any) => {
    if (!variant.units || variant.units.length === 0) return;
    
    if (variant.units.length === 1) {
      addToCart(product, variant, variant.units[0]);
    } else {
      setSelectingUnitFor({ product, variant });
    }
  };

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
    <div className="h-full w-full p-4 lg:p-6 overflow-hidden">
      <div className="h-full w-full flex flex-row rounded-2xl shadow-sm border border-[#E5E1DA] overflow-hidden">
        {/* Left Panel: Product Catalog (65%) */}
        <div className="flex-[6.5] flex flex-col relative h-full bg-[#F7F6F4]">
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
                product.variants.map((variant: any) => {
                  const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                  const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                  const stock = Number(variant.baseStockQuantity) || 0;
                  
                  return (
                    <div 
                      key={variant.id}
                      onClick={() => handleVariantClick(product, variant)}
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
                        <div className="text-xs text-gray-500 mt-0.5">{variant.name === 'Default' ? 'Standard' : variant.name}</div>
                      </div>
                      <div className="flex items-end justify-between mt-2 pt-1 border-t border-gray-50">
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Stock: {stock}</div>
                          <div className="text-sm font-semibold text-[#D97706]">
                            KSH {priceToDisplay.toLocaleString()}
                          </div>
                        </div>
                        {/* Stock indicator dot */}
                        <div className={`w-2.5 h-2.5 rounded-full mb-1.5 ${stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} title={stock > 0 ? 'In stock' : 'Out of stock'}></div>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Checkout / Current Order (35%, fixed, min-w-320px) */}
      <div className="flex-[3.5] min-w-[320px] bg-[#2A2926] border-l border-zinc-800 flex flex-col h-full shrink-0">
        
        {/* Fixed Top Section */}
        <div className="p-4 shrink-0 flex flex-col gap-4 border-b border-zinc-800">
          <div className="flex justify-between items-center">
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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Customer (Optional)</label>
            <select 
              className="w-full bg-white text-gray-900 text-sm rounded-lg h-9 px-3 outline-none focus:ring-2 focus:ring-[#D97706]"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Walk-in Customer</option>
              <option value="new">+ Add new customer</option>
            </select>
          </div>
        </div>

        {/* Scrollable Middle Section: Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <span className="text-xl">🛒</span>
              <p className="font-medium text-sm text-zinc-400">Cart Empty</p>
              <p className="text-xs text-zinc-500">Select a product to begin</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {cart.map((item) => (
                <div key={item.unitId} className="flex flex-col py-3 border-b border-zinc-800/50 last:border-0 group">
                  <div className="flex justify-between items-start">
                    <div className="pr-2 flex-1">
                      <div className="font-medium text-white text-sm truncate" title={item.productName}>{item.productName}</div>
                    </div>
                    <div className="font-semibold text-white text-sm shrink-0">
                      KSH {(item.quantity * item.sellingPrice).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {variantNameText(item)}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.unitId, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-[#D97706]/10 hover:text-[#D97706] transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-sm w-8 text-center text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.unitId, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-[#D97706]/10 hover:text-[#D97706] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.unitId)} 
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Bottom Section: Totals & Checkout */}
        <div className="p-4 shrink-0 bg-[#2A2926] border-t border-zinc-800">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span>Subtotal</span>
              <span>KSH {cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span>Discount</span>
              <span>—</span>
            </div>
            
            <div className="flex justify-between items-end border-t border-[#D97706]/30 pt-3 mt-1">
              <span className="text-sm font-bold text-white tracking-wider uppercase">Total</span>
              <span className="text-2xl font-bold text-white leading-none">
                KSH {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-14 bg-[#D97706] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base rounded-xl transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            Proceed To Payment
          </button>
        </div>
      </div>

      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalAmount={cartTotal}
        onSuccess={() => {
          setCart([]);
          setIsCheckoutOpen(false);
        }}
      />

      {selectingUnitFor && (
        <UnitSelectionModal
          isOpen={true}
          onClose={() => setSelectingUnitFor(null)}
          product={selectingUnitFor.product}
          variant={selectingUnitFor.variant}
          onAddToCart={(p, v, u) => {
            addToCart(p, v, u);
          }}
        />
      )}
    </div>
  );
};

// Helper for displaying variant name if it's not default
function variantNameText(item: any) {
  if (item.variantName === 'Default') return item.unitName;
  return `${item.variantName} • ${item.unitName}`;
}
